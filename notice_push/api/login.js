const { json, readBody, env, makeToken } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return json(res, 200, { ok: true });
  if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' });
  try {
    const { password } = await readBody(req);
    const adminPwd = env('ADMIN_PASSWORD');
    if ((password || '').trim() !== adminPwd) return json(res, 401, { error: 'bad_password' });
    const token = makeToken(adminPwd, { exp: Date.now() + 7 * 24 * 60 * 60 * 1000 });
    return json(res, 200, { token });
  } catch (e) {
    return json(res, 500, { error: e && e.message ? e.message : 'server_error' });
  }
};
