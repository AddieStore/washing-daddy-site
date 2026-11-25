// WhatsApp sign-in code: the two requests, start to finish. deps carries everything that touches the outside:
//   saRaw     the service account JSON (n8n env FIREBASE_SA_JSON, same key as workflow 12)
//   project   optional n8n env FIREBASE_PROJECT_ID; must match the key's project when set
//   deny      optional extra numbers that never get a WhatsApp code (n8n env WA_OTP_DENY, comma separated, +91...)
//   wa        { token, phoneId, template, lang }   (n8n env WA_TOKEN, WA_PHONE_ID, WA_OTP_TEMPLATE, WA_OTP_LANG)
//   http({method,url,headers,body}) -> {status, body}   never throws; status 0 = no answer
//   now() -> ms, sleep(ms), jitter() -> ms of extra delay on a failure, newCode() -> '123456', salt() -> base64
// Each returns { status, body } for the Respond node.
//   waSendCode   body { ok:true } | { ok:false, code: bad_number | use_sms | wait (+ wait seconds) | too_many | not_on_whatsapp | server }
//   waVerifyCode body { ok:true, token } | { ok:false, code: bad_code | wrong_code | expired | too_many | server }

const WA_GRAPH = 'https://graph.facebook.com/v21.0/';

async function waSetup(deps) {
  const sa = parseSa(deps.saRaw);
  if (!sa) return null;
  const project = String(deps.project || '').trim();
  if (project && project !== sa.project_id) return null;
  const tok = await deps.http({
    method: 'POST', url: OAUTH_URL,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') + '&assertion=' + encodeURIComponent(oauthAssertion(sa, deps.now())),
  });
  const access = tok.status === 200 && tok.body && typeof tok.body.access_token === 'string' ? tok.body.access_token : '';
  if (!access) return null;
  const auth = { Authorization: 'Bearer ' + access };
  const docs = 'https://firestore.googleapis.com/v1/projects/' + sa.project_id + '/databases/(default)/documents/';
  const getDoc = async url => {
    const r = await deps.http({ method: 'GET', url, headers: auth });
    if (r.status === 404) return { missing: true, fields: {} };
    if (r.status !== 200 || !r.body || typeof r.body !== 'object') return null;
    return { fields: fsFields(r.body), updateTime: r.body.updateTime };
  };
  // write `fields`; with updateTime only if nobody wrote the doc since we read it. 'ok' | 'conflict' | 'error'
  const patch = async (url, fields, updateTime) => {
    const keys = Object.keys(fields);
    const q = keys.map(k => 'updateMask.fieldPaths=' + encodeURIComponent(k)).join('&')
      + (updateTime ? '&currentDocument.updateTime=' + encodeURIComponent(updateTime) : '');
    const enc = {}; keys.forEach(k => { enc[k] = fsEncode(fields[k]) });
    const r = await deps.http({ method: 'PATCH', url: url + '?' + q, headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: enc }) });
    if (r.status === 200) return 'ok';
    const st = r.body && r.body.error && r.body.error.status;
    if (r.status === 409 || st === 'FAILED_PRECONDITION' || st === 'ABORTED') return 'conflict';
    return 'error';
  };
  return { sa, auth, docs, getDoc, patch };
}

function waFailer(deps) {
  return async (code, extra) => {
    try { await deps.sleep(300 + Math.max(0, Math.min(500, Number(deps.jitter()) || 0))) } catch (e) { }
    return { status: code === 'server' ? 500 : 200, body: { ok: false, code, ...(extra || {}) } };
  };
}

async function waSendCode(reqBody, deps) {
  const fail = waFailer(deps);
  try {
    const b = reqBody && typeof reqBody === 'object' ? reqBody : {};
    const phone = waPhone(b.phone);
    if (!phone) return await fail('bad_number');
    const deny = WA_DENY.concat(String(deps.deny || '').split(',').map(s => s.trim()).filter(Boolean));
    if (deny.indexOf(phone) >= 0) return await fail('use_sms');
    const wa = deps.wa || {};
    if (!wa.token || !wa.phoneId || !wa.template) return await fail('server');
    const g = await waSetup(deps);
    if (!g) return await fail('server');
    const url = g.docs + 'waotp/' + encodeURIComponent(phone);

    for (let round = 0; round < 3; round++) {
      const d = await g.getDoc(url);
      if (!d) return await fail('server');
      const now = deps.now();
      const gate = waSendGate(d.fields, now);
      if (!gate.ok) return await fail(gate.code, gate.wait ? { wait: gate.wait } : undefined);
      const code = deps.newCode(), salt = deps.salt();
      // store first (counted even if WhatsApp then fails, so a broken send cannot be retried in a tight loop)
      const w = await g.patch(url, {
        hash: waHash(g.sa.private_key, phone, code, salt), salt, tries: 0,
        expires_at: new Date(now + WA_TTL_MS).toISOString(), last_sent: new Date(now).toISOString(),
        sends: gate.sends, window_start: gate.window_start,
      }, d.missing ? null : d.updateTime);
      if (w === 'conflict') continue;
      if (w !== 'ok') return await fail('server');
      const r = await deps.http({
        method: 'POST', url: WA_GRAPH + encodeURIComponent(wa.phoneId) + '/messages',
        headers: { Authorization: 'Bearer ' + wa.token, 'Content-Type': 'application/json' },
        body: JSON.stringify(waMessage(phone, code, wa.template, wa.lang)),
      });
      if (r.status === 200 && r.body && Array.isArray(r.body.messages) && r.body.messages.length) return { status: 200, body: { ok: true } };
      const err = r.body && r.body.error;
      // 131026: the number is not on WhatsApp (or cannot receive) -> the app offers SMS
      if (err && (err.code === 131026 || err.error_subcode === 131026)) return await fail('not_on_whatsapp');
      return await fail('server');
    }
    return await fail('server');
  } catch (e) {
    return await fail('server');
  }
}

async function waVerifyCode(reqBody, deps) {
  const fail = waFailer(deps);
  try {
    const b = reqBody && typeof reqBody === 'object' ? reqBody : {};
    const phone = waPhone(b.phone);
    const code = b.code;
    if (!phone || !waCodeOk(code)) return await fail('bad_code');
    const g = await waSetup(deps);
    if (!g) return await fail('server');
    const url = g.docs + 'waotp/' + encodeURIComponent(phone);

    let passed = false;
    for (let round = 0; round < 3 && !passed; round++) {
      const d = await g.getDoc(url);
      if (!d) return await fail('server');
      const rec = d.fields;
      if (d.missing || typeof rec.hash !== 'string' || typeof rec.salt !== 'string' || !rec.hash) return await fail('expired');
      const now = deps.now(), exp = Date.parse(rec.expires_at || '');
      if (!Number.isFinite(exp) || exp <= now) return await fail('expired');
      const tries = Number.isInteger(rec.tries) && rec.tries > 0 ? rec.tries : 0;
      if (tries >= WA_MAX_TRIES) return await fail('too_many');
      if (!waSame(waHash(g.sa.private_key, phone, code, rec.salt), rec.hash)) {
        const w = await g.patch(url, { tries: tries + 1 }, d.updateTime);
        if (w === 'conflict') continue;
        if (w !== 'ok') return await fail('server');       // never answer "wrong code" without having counted it
        return await fail(tries + 1 >= WA_MAX_TRIES ? 'too_many' : 'wrong_code');
      }
      // right: burn the code (one use only), only then hand out a token
      const w = await g.patch(url, { hash: '', tries: 0, expires_at: null }, d.updateTime);
      if (w === 'conflict') continue;
      if (w !== 'ok') return await fail('server');
      passed = true;
    }
    if (!passed) return await fail('server');

    // the Firebase user for this number: the same uid an SMS sign-in made, so rules and data carry over
    const it = 'https://identitytoolkit.googleapis.com/v1/projects/' + g.sa.project_id;
    const json = { ...g.auth, 'Content-Type': 'application/json' };
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
      else { found = await lookup(); user = found && found.user }
      if (!user) return await fail('server');
    }
    if (user.disabled === true) return await fail('server');
    if (typeof user.localId !== 'string' || !user.localId) return await fail('server');
    return { status: 200, body: { ok: true, token: customToken(g.sa, user.localId, deps.now()) } };
  } catch (e) {
    return await fail('server');
  }
}
