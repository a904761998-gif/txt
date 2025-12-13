const { json, env, sbFetch } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return json(res, 200, { ok: true });
  if (req.method !== 'GET') return json(res, 405, { error: 'method_not_allowed' });
  try {
    const url = env('SUPABASE_URL');
    const key = env('SUPABASE_ANON_KEY');

    const items = await sbFetch(
      '/rest/v1/announcements?select=id,title,content,created_at&order=created_at.desc&limit=1',
      { method: 'GET' },
      { url, key }
    );

    const item = Array.isArray(items) && items.length ? items[0] : null;
    return json(res, 200, { item });
  } catch (e) {
    const status = e && e.status ? e.status : 500;
    return json(res, status, { error: e && e.message ? e.message : 'server_error' });
  }
};
