(() => {
  const loginCard = document.getElementById('login-card');
  const adminCard = document.getElementById('admin-card');
  const passwordEl = document.getElementById('password');
  const loginBtn = document.getElementById('login-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const loginError = document.getElementById('login-error');

  const titleEl = document.getElementById('title');
  const contentEl = document.getElementById('content');
  const publishBtn = document.getElementById('publish-btn');
  const publishError = document.getElementById('publish-error');
  const historyEl = document.getElementById('history');

  const TOKEN_KEY = 'notice_admin_token_v1';

  function setErr(el, msg) {
    el.textContent = msg || '';
  }

  function token() {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  }

  function setToken(v) {
    try {
      if (!v) localStorage.removeItem(TOKEN_KEY);
      else localStorage.setItem(TOKEN_KEY, v);
    } catch {}
  }

  async function api(path, { method = 'GET', body } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    const t = token();
    if (t) headers.Authorization = `Bearer ${t}`;
    const res = await fetch(path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const txt = await res.text();
    let data = null;
    try { data = txt ? JSON.parse(txt) : null; } catch { data = { error: txt || 'invalid_json' }; }
    if (!res.ok) {
      const msg = (data && (data.error || data.message)) || `HTTP_${res.status}`;
      throw new Error(msg);
    }
    return data;
  }

  function fmt(ts) {
    try {
      const d = new Date(ts);
      if (Number.isNaN(d.getTime())) return ts;
      return d.toLocaleString();
    } catch {
      return ts;
    }
  }

  function renderHistory(items) {
    historyEl.innerHTML = '';
    if (!items || items.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'sub';
      empty.textContent = '暂无记录';
      historyEl.appendChild(empty);
      return;
    }
    items.forEach((it) => {
      const div = document.createElement('div');
      div.className = 'item';
      const t = document.createElement('div');
      t.className = 't';
      t.textContent = it.title || '(无标题)';
      const m = document.createElement('div');
      m.className = 'm';
      m.textContent = it.content || '';
      const d = document.createElement('div');
      d.className = 'd';
      d.textContent = `${fmt(it.created_at)}  |  id: ${it.id}`;
      div.appendChild(t);
      div.appendChild(m);
      div.appendChild(d);
      historyEl.appendChild(div);
    });
  }

  async function loadHistory() {
    const data = await api('/api/list');
    renderHistory(data.items || []);
  }

  function setAuthed(on) {
    loginCard.classList.toggle('hidden', on);
    adminCard.classList.toggle('hidden', !on);
  }

  async function doLogin() {
    setErr(loginError, '');
    const pwd = (passwordEl.value || '').trim();
    if (!pwd) {
      setErr(loginError, '请输入密码');
      return;
    }
    try {
      const data = await api('/api/login', { method: 'POST', body: { password: pwd } });
      if (!data || !data.token) throw new Error('login_failed');
      setToken(data.token);
      setAuthed(true);
      await loadHistory();
    } catch (e) {
      setErr(loginError, e && e.message ? e.message : '登录失败');
    }
  }

  async function doPublish() {
    setErr(publishError, '');
    const title = (titleEl.value || '').trim();
    const content = (contentEl.value || '').trim();
    if (!title && !content) {
      setErr(publishError, '标题/内容至少填一个');
      return;
    }
    publishBtn.disabled = true;
    try {
      await api('/api/publish', { method: 'POST', body: { title, content } });
      titleEl.value = '';
      contentEl.value = '';
      await loadHistory();
    } catch (e) {
      setErr(publishError, e && e.message ? e.message : '发布失败');
    } finally {
      publishBtn.disabled = false;
    }
  }

  function doLogout() {
    setToken('');
    setAuthed(false);
    setErr(loginError, '');
    setErr(publishError, '');
  }

  loginBtn.addEventListener('click', doLogin);
  passwordEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doLogin();
  });
  logoutBtn.addEventListener('click', doLogout);
  publishBtn.addEventListener('click', doPublish);

  (async () => {
    const t = token();
    if (!t) return;
    try {
      await loadHistory();
      setAuthed(true);
    } catch {
      doLogout();
    }
  })();
})();
