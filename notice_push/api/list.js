const { json, env, verifyToken, getAuthToken, sbFetch } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return json(res, 200, { ok: true });
  if (req.method !== 'GET') return json(res, 405, { error: 'method_not_allowed' });
  try {
    const adminPwd = env('ADMIN_PASSWORD');
    const t = getAuthToken(req);
    const ok = verifyToken(adminPwd, t);
    if (!ok) return json(res, 401, { error: 'unauthorized' });

    const url = env('SUPABASE_URL');
    const key = env('SUPABASE_SERVICE_ROLE_KEY');

    const items = await sbFetch(
      '/rest/v1/announcements?select=id,title,content,created_at&order=created_at.desc&limit=50',
      { method: 'GET' },
      { url, key }
    );

    return json(res, 200, { items: Array.isArray(items) ? items : [] });
  } catch (e) {
    const status = e && e.status ? e.status : 500;
    return json(res, status, { error: e && e.message ? e.message : 'server_error' });
  }
};
