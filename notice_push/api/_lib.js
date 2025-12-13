const crypto = require('crypto');

function json(res, status, data) {
  res.statusCode = status;
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => { raw += c; });
    req.on('end', () => {
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch (e) { reject(new Error('invalid_json')); }
    });
  });
}

function env(name) {
  const v = process.env[name];
  if (!v) throw new Error(`missing_env:${name}`);
  return v;
}

function hmac(secret, msg) {
  return crypto.createHmac('sha256', secret).update(msg).digest('base64url');
}

function makeToken(secret, payload) {
  const b64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = hmac(secret, b64);
  return `${b64}.${sig}`;
}

function verifyToken(secret, token) {
  const parts = (token || '').split('.');
  if (parts.length !== 2) return null;
  const [b64, sig] = parts;
  const expect = hmac(secret, b64);
  const a = Buffer.from(sig);
  const b = Buffer.from(expect);
  if (a.length !== b.length) return null;
  if (!crypto.timingSafeEqual(a, b)) return null;
  let payload;
  try { payload = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8')); } catch { return null; }
  if (!payload || payload.exp < Date.now()) return null;
  return payload;
}

function getAuthToken(req) {
  const h = req.headers.authorization || '';
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1] : '';
}

async function sbFetch(path, { method = 'GET', headers = {}, body } = {}, { url, key }) {
  const res = await fetch(`${url}${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      ...headers,
    },
    body,
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { error: text || 'invalid_json' }; }
  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || `supabase_${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return data;
}

module.exports = {
  json,
  readBody,
  env,
  makeToken,
  verifyToken,
  getAuthToken,
  sbFetch,
};
