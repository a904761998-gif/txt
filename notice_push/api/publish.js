const { json, readBody, env, verifyToken, getAuthToken, sbFetch } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return json(res, 200, { ok: true });
  if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' });
  try {
    const adminPwd = env('ADMIN_PASSWORD');
    const t = getAuthToken(req);
    const ok = verifyToken(adminPwd, t);
    if (!ok) return json(res, 401, { error: 'unauthorized' });

    const { title = '', content = '' } = await readBody(req);
    const t1 = String(title || '').trim();
    const c1 = String(content || '').trim();
    if (!t1 && !c1) return json(res, 400, { error: 'empty' });

    const url = env('SUPABASE_URL');
    const key = env('SUPABASE_SERVICE_ROLE_KEY');

    const data = await sbFetch(
      '/rest/v1/announcements',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify([{ title: t1, content: c1 }]),
      },
      { url, key }
    );

    return json(res, 200, { item: Array.isArray(data) ? data[0] : data });
  } catch (e) {
    const status = e && e.status ? e.status : 500;
    return json(res, status, { error: e && e.message ? e.message : 'server_error' });
  }
};
