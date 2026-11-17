// Washer PIN login: the whole request, start to finish. deps carries everything that touches the outside:
//   saRaw    the service account JSON (n8n env FIREBASE_SA_JSON)
//   project  optional n8n env FIREBASE_PROJECT_ID; must match the key's project when set
//   deny     optional extra numbers that may never use a PIN (n8n env PIN_DENY_PHONES, comma separated)
//   http({method,url,headers,body}) -> {status, body}   never throws; status 0 = no answer
//   now() -> ms, sleep(ms), jitter() -> ms of extra delay on a failure
// Returns { status, body } for the Respond node. body is { ok:true, token } or { ok:false, code } with code one of
// bad_pin | locked | not_set | not_washer | server, and nothing else, whatever went wrong.

async function pinLogin(reqBody, deps) {
  const fail = async code => {
    try { await deps.sleep(400 + Math.max(0, Math.min(600, Number(deps.jitter()) || 0))) } catch (e) { }
    return { status: code === 'server' ? 500 : 200, body: { ok: false, code } };
  };
  try {
    const b = reqBody && typeof reqBody === 'object' ? reqBody : {};
    const phone = pinPhone(b.phone);
    const pin = b.pin;
    if (!phone || !pinOk(pin)) return await fail('bad_pin');

    const sa = parseSa(deps.saRaw);
    if (!sa) return await fail('server');
    const project = String(deps.project || '').trim();
    if (project && project !== sa.project_id) return await fail('server');
    const deny = PIN_DENY.concat(String(deps.deny || '').split(',').map(s => s.trim()).filter(Boolean));
    if (deny.indexOf(phone) >= 0) return await fail('not_washer');

    // Google access token for Firestore + Identity Toolkit (asked fresh for every login: logins are rare)
    const tok = await deps.http({
      method: 'POST', url: OAUTH_URL,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') + '&assertion=' + encodeURIComponent(oauthAssertion(sa, deps.now())),
    });
    const access = tok.status === 200 && tok.body && typeof tok.body.access_token === 'string' ? tok.body.access_token : '';
    if (!access) return await fail('server');
    const auth = { Authorization: 'Bearer ' + access };
    const docs = 'https://firestore.googleapis.com/v1/projects/' + sa.project_id + '/databases/(default)/documents/';
    const pinUrl = docs + 'washerpins/' + encodeURIComponent(phone);
    const getDoc = async url => {
      const r = await deps.http({ method: 'GET', url, headers: auth });
      if (r.status === 404) return { missing: true };
      if (r.status !== 200 || !r.body || typeof r.body !== 'object') return null;
      return { fields: fsFields(r.body), updateTime: r.body.updateTime };
    };
    // write only `fields`, and only if nobody else wrote the doc since we read it (two logins at once must not
    // both count from the same `fails`). 'ok' | 'conflict' | 'error'
    const patch = async (fields, updateTime) => {
      const keys = Object.keys(fields);
      const q = keys.map(k => 'updateMask.fieldPaths=' + encodeURIComponent(k)).join('&')
        + '&currentDocument.updateTime=' + encodeURIComponent(updateTime);
      const enc = {}; keys.forEach(k => { enc[k] = fsEncode(fields[k]) });
      const r = await deps.http({ method: 'PATCH', url: pinUrl + '?' + q, headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: enc }) });
      if (r.status === 200) return 'ok';
      const st = r.body && r.body.error && r.body.error.status;
      if (r.status === 409 || st === 'FAILED_PRECONDITION' || st === 'ABORTED') return 'conflict';
      return 'error';
    };

    let passed = false;
    for (let round = 0; round < 3 && !passed; round++) {
      const d = await getDoc(pinUrl);
      if (!d) return await fail('server');
      const rec = d.fields || {};
      if (d.missing || rec.active !== true || typeof rec.hash !== 'string' || typeof rec.salt !== 'string') return await fail('not_set');
      if (typeof d.updateTime !== 'string' || !d.updateTime) return await fail('server');
      const now = deps.now();
      if (pinLockedUntil(rec, now)) return await fail('locked');
      if (!pinVerify(pin, rec)) {
        const nx = pinAfterFail(rec, now);
        const w = await patch({ fails: nx.fails, locked_until: nx.locked_until }, d.updateTime);
        if (w === 'conflict') continue;           // someone else tried at the same moment: count again from fresh
        if (w !== 'ok') return await fail('server'); // never answer "wrong PIN" without having counted it
        return await fail(nx.locked ? 'locked' : 'bad_pin');
      }
      // right PIN: only now is it worth saying whether this number may work at all
      const wd = await getDoc(docs + 'washers/' + encodeURIComponent(phone));
      if (!wd) return await fail('server');
      if (wd.missing || !wd.fields || wd.fields.status !== 'approved') return await fail('not_washer');
      if ((rec.fails || 0) !== 0 || rec.locked_until) {
        const w = await patch({ fails: 0, locked_until: null }, d.updateTime);
        if (w === 'conflict') continue;
        if (w !== 'ok') return await fail('server');
      }
      passed = true;
    }
    if (!passed) return await fail('server');

    // the Firebase user for this number: the same uid the phone-OTP sign-in made, so rules and data carry over
    const it = 'https://identitytoolkit.googleapis.com/v1/projects/' + sa.project_id;
    const json = { ...auth, 'Content-Type': 'application/json' };
    const lookup = async () => {
      const r = await deps.http({ method: 'POST', url: it + '/accounts:lookup', headers: json, body: JSON.stringify({ phoneNumber: [phone] }) });
      if (r.status !== 200 || !r.body || typeof r.body !== 'object') return null;
      const users = Array.isArray(r.body.users) ? r.body.users.filter(u => u && u.phoneNumber === phone) : [];
      return { user: users[0] || null };
    };
    let found = await lookup();
    if (!found) return await fail('server');
    let user = found.user;
    if (!user) {
      const r = await deps.http({ method: 'POST', url: it + '/accounts', headers: json, body: JSON.stringify({ phoneNumber: phone }) });
      if (r.status === 200 && r.body && typeof r.body.localId === 'string') user = { localId: r.body.localId, phoneNumber: phone };
      else {
        found = await lookup();            // made at the same moment by another login
        user = found && found.user;
      }
      if (!user) return await fail('server');
    }
    if (user.disabled === true) return await fail('not_washer');
    if (typeof user.localId !== 'string' || !user.localId) return await fail('server');
    return { status: 200, body: { ok: true, token: customToken(sa, user.localId, deps.now()) } };
  } catch (e) {
    return await fail('server');
  }
}
