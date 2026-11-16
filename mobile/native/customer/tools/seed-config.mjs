#!/usr/bin/env node
// Seed the LIVE APP CONFIG in Firestore with today's built-in content (src/data/builtin.ts), so the admin dashboard
// starts with the current catalogue, packs, store, plans, WD Pass, coupons, legal pages, help topics, fees and slots.
// Contract: /mnt/project-files/dashboard-2026-11-16/CONFIG-CONTRACT.md
//
//   node tools/seed-config.mjs                 prints the documents as JSON (no credentials needed, writes nothing)
//   node tools/seed-config.mjs --out seed.json  same, into a file
//   GOOGLE_APPLICATION_CREDENTIALS=key.json node tools/seed-config.mjs --write
//        creates every document that does NOT exist yet (never overwrites what the dashboard already changed)
//   ... --write --overwrite                     replaces existing documents too (back to today's content)
//   ... --write --only catalog,legal            limit to some collections
// The key is a Firebase service-account JSON (Firebase console > Project settings > Service accounts > Generate new
// private key). Nothing else to install: the TypeScript tables are transpiled with the project's own typescript, and
// Firestore is written through its REST API with a token signed by node:crypto.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), flag = n => args.includes(n), opt = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null };
const DEFAULT_PROJECT = 'gen-lang-client-0799769592';

/* ---------- 1. load builtinDocs() from the app's TypeScript ---------- */
async function loadBuiltin() {
  const ts = createRequire(path.join(root, 'package.json'))('typescript');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wd-seed-'));
  for (const f of ['reference', 'legal', 'help', 'builtin']) {
    const src = fs.readFileSync(path.join(root, 'src/data', f + '.ts'), 'utf8');
    let js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
    js = js.replace(/from\s+['"]\.\/(reference|legal|help|dates)['"]/g, (_m, n) => `from './${n}.mjs'`);
    fs.writeFileSync(path.join(tmp, f + '.mjs'), js);
  }
  const mod = await import(pathToFileURL(path.join(tmp, 'builtin.mjs')).href);
  return mod.builtinDocs();
}

/* ---------- 2. Firestore REST ---------- */
const b64u = b => Buffer.from(b).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
async function token(sa) {
  const now = Math.floor(Date.now() / 1000);
  const head = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const body = b64u(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/datastore', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  const sig = b64u(crypto.createSign('RSA-SHA256').update(head + '.' + body).sign(sa.private_key));
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${head}.${body}.${sig}` }) });
  const j = await r.json(); if (!j.access_token) throw new Error('token: ' + JSON.stringify(j)); return j.access_token;
}
function val(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (Array.isArray(v)) { if (v.some(Array.isArray)) throw new Error('nested array (Firestore rejects these): ' + JSON.stringify(v).slice(0, 80)); return { arrayValue: { values: v.map(val) } } }
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).filter(([, x]) => x !== undefined).map(([k, x]) => [k, val(x)])) } };
}

/* ---------- 3. main ---------- */
const docs = await loadBuiltin();
const only = (opt('--only') || '').split(',').filter(Boolean);
const list = [];
for (const [coll, items] of Object.entries(docs)) {
  if (only.length && !only.includes(coll)) continue;
  for (const [id, data] of Object.entries(items)) list.push({ path: `${coll}/${id}`, data: { ...data, updatedAt: new Date().toISOString(), updatedBy: 'seed-config' } });
}
list.forEach(d => val(d.data));   // fails early on anything Firestore cannot store

if (!flag('--write')) {
  const out = JSON.stringify(Object.fromEntries(list.map(d => [d.path, d.data])), null, 2);
  if (opt('--out')) { fs.writeFileSync(opt('--out'), out); console.error(`Wrote ${list.length} documents to ${opt('--out')} (dry run, nothing sent to Firestore)`) }
  else { process.stdout.write(out + '\n'); console.error(`\n${list.length} documents (dry run). Add --write with GOOGLE_APPLICATION_CREDENTIALS to create them in Firestore.`) }
  process.exit(0);
}
const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS || opt('--key');
if (!keyFile || !fs.existsSync(keyFile)) { console.error('--write needs a service-account key: GOOGLE_APPLICATION_CREDENTIALS=/path/key.json (or --key /path/key.json). Run without --write to print the JSON.'); process.exit(1) }
const sa = JSON.parse(fs.readFileSync(keyFile, 'utf8')), project = opt('--project') || sa.project_id || DEFAULT_PROJECT;
const tk = await token(sa), base = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`;
const overwrite = flag('--overwrite');
let made = 0, kept = 0, failed = 0;
for (let i = 0; i < list.length; i += 400) {
  const chunk = list.slice(i, i + 400);
  const writes = chunk.map(d => ({ update: { name: `projects/${project}/databases/(default)/documents/${d.path}`, fields: val(d.data).mapValue.fields }, ...(overwrite ? {} : { currentDocument: { exists: false } }) }));
  const r = await fetch(base + ':batchWrite', { method: 'POST', headers: { Authorization: 'Bearer ' + tk, 'Content-Type': 'application/json' }, body: JSON.stringify({ writes }) });
  const j = await r.json();
  if (!r.ok) { console.error('batchWrite failed', r.status, JSON.stringify(j).slice(0, 400)); process.exit(1) }
  (j.status || []).forEach((st, k) => {
    if (!st.code) { made++; return }
    if (st.code === 9 || st.code === 6) { kept++; return }   // FAILED_PRECONDITION / ALREADY_EXISTS: the doc is already there
    failed++; console.error(chunk[k].path, st.message);
  });
}
console.log(`Project ${project}: ${made} written, ${kept} already there (kept${overwrite ? '' : ', use --overwrite to replace'}), ${failed} failed.`);
process.exit(failed ? 1 : 0);
