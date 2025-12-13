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
  const toast = document.getElementById('toast');
  const toolBold = document.getElementById('tool-bold');
  const toolItalic = document.getElementById('tool-italic');
  const toolLink = document.getElementById('tool-link');
  const imgPanel = document.getElementById('img-panel');
  const imgSize = document.getElementById('img-size');
  const imgSizeVal = document.getElementById('img-size-val');

  const TOKEN_KEY = 'notice_admin_token_v1';

  function setErr(el, msg) {
    el.textContent = msg || '';
  }

  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg || '发送成功';
    toast.hidden = false;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => { toast.hidden = true; }, 1800);
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
      const raw = it.content || '';
      const looksHtml = /<\s*(a|img|div|p|br|span|strong|em|ul|ol|li|pre|code)\b/i.test(raw);
      m.textContent = looksHtml ? '[富文本公告]' : raw;
      const d = document.createElement('div');
      d.className = 'd';
      d.textContent = `${fmt(it.created_at)}  |  id: ${it.id}`;
      div.appendChild(t);
      div.appendChild(m);
      div.appendChild(d);
      historyEl.appendChild(div);
    });
  }

  function exec(cmd) {
    try { document.execCommand(cmd); } catch {}
    try { contentEl.focus(); } catch {}
  }

  function insertLink() {
    const url = prompt('请输入链接（以 http/https 开头）');
    if (!url) return;
    const u = url.trim();
    if (!/^https?:\/\//i.test(u)) {
      showToast('链接需以 http/https 开头');
      return;
    }
    try {
      document.execCommand('createLink', false, u);
      const sel = window.getSelection();
      const a = sel && sel.anchorNode ? sel.anchorNode.parentElement : null;
      if (a && a.tagName === 'A') {
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener noreferrer');
      }
    } catch {}
    try { contentEl.focus(); } catch {}
  }

  let selectedImg = null;

  function selectImg(img) {
    selectedImg = img;
    if (!imgPanel || !imgSize || !imgSizeVal) return;
    imgPanel.classList.toggle('hidden', !img);
    if (!img) return;
    const styleW = (img.style.width || '').trim();
    const m = /^(\d+)%$/.exec(styleW);
    const v = m ? Number(m[1]) : 80;
    imgSize.value = String(v);
    imgSizeVal.textContent = `${v}%`;
  }

  function insertImageDataUrl(dataUrl) {
    const img = document.createElement('img');
    img.src = dataUrl;
    img.alt = 'image';
    img.style.width = '80%';
    img.style.height = 'auto';
    img.addEventListener('click', () => selectImg(img));
    const br = document.createElement('div');
    br.innerHTML = '<br>';
    contentEl.appendChild(img);
    contentEl.appendChild(br);
    selectImg(img);
    contentEl.focus();
  }

  async function handlePaste(e) {
    const dt = e.clipboardData;
    if (!dt) return;
    const items = Array.from(dt.items || []);
    const imgItem = items.find(i => i.type && i.type.startsWith('image/'));
    if (!imgItem) return;
    e.preventDefault();
    const file = imgItem.getAsFile();
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      if (dataUrl) insertImageDataUrl(dataUrl);
    };
    reader.readAsDataURL(file);
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
    const content = (contentEl.innerHTML || '').trim();
    if (!title && !content) {
      setErr(publishError, '标题/内容至少填一个');
      return;
    }
    publishBtn.disabled = true;
    try {
      await api('/api/publish', { method: 'POST', body: { title, content } });
      titleEl.value = '';
      contentEl.innerHTML = '';
      selectImg(null);
      showToast('发送成功');
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

  if (contentEl) {
    contentEl.addEventListener('paste', handlePaste);
    contentEl.addEventListener('click', (e) => {
      const t = e.target;
      if (t && t.tagName === 'IMG') selectImg(t);
    });
  }

  if (toolBold) toolBold.addEventListener('click', () => exec('bold'));
  if (toolItalic) toolItalic.addEventListener('click', () => exec('italic'));
  if (toolLink) toolLink.addEventListener('click', insertLink);

  if (imgSize && imgSizeVal) {
    imgSize.addEventListener('input', () => {
      const v = Number(imgSize.value || 80);
      imgSizeVal.textContent = `${v}%`;
      if (selectedImg) {
        selectedImg.style.width = `${v}%`;
        selectedImg.style.height = 'auto';
      }
    });
  }

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
