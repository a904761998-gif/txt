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
  const toolUnderline = document.getElementById('tool-underline');
  const toolLink = document.getElementById('tool-link');
  const toolColor = document.getElementById('tool-color');
  const toolEmoji = document.getElementById('tool-emoji');
  const emojiPanel = document.getElementById('emoji-panel');

  const TOKEN_KEY = 'notice_admin_token_v1';

  let savedRange = null;

  function saveSelection() {
    try {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const r = sel.getRangeAt(0);
      if (!contentEl || !contentEl.contains(r.commonAncestorContainer)) return;
      savedRange = r.cloneRange();
    } catch {}
  }

  function restoreSelection() {
    try {
      if (!savedRange) return;
      const sel = window.getSelection();
      if (!sel) return;
      sel.removeAllRanges();
      sel.addRange(savedRange);
    } catch {}
  }

  function htmlToPlainText(html) {
    const tpl = document.createElement('template');
    tpl.innerHTML = String(html || '');
    // Replace images with token
    tpl.content.querySelectorAll('img').forEach((img) => {
      const t = document.createTextNode('[图片]');
      img.replaceWith(t);
    });
    // Convert block-ish elements to line breaks
    tpl.content.querySelectorAll('br').forEach((br) => br.replaceWith(document.createTextNode('\n')));
    tpl.content.querySelectorAll('p, div, li, pre').forEach((el) => {
      el.appendChild(document.createTextNode('\n'));
    });
    const text = tpl.content.textContent || '';
    return text.replace(/\n{3,}/g, '\n\n').trim();
  }

  function setErr(el, msg) {
    el.textContent = msg || '';
  }

  function autoLinkifyEditorHtml(html) {
    const tpl = document.createElement('template');
    tpl.innerHTML = String(html || '');
    const re = /((https?:\/\/)[^\s<]+|www\.[^\s<]+)/gi;

    (function walk(node) {
      const kids = Array.from(node.childNodes);
      kids.forEach((c) => {
        if (c.nodeType === Node.TEXT_NODE) {
          const text = c.nodeValue || '';
          if (!re.test(text)) return;
          re.lastIndex = 0;
          const frag = document.createDocumentFragment();
          let last = 0;
          let m;
          while ((m = re.exec(text))) {
            const before = text.slice(last, m.index);
            if (before) frag.appendChild(document.createTextNode(before));
            const raw = m[1];
            const href = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
            const a = document.createElement('a');
            a.href = href;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.textContent = raw;
            frag.appendChild(a);
            last = m.index + raw.length;
          }
          const after = text.slice(last);
          if (after) frag.appendChild(document.createTextNode(after));
          c.replaceWith(frag);
        } else if (c.nodeType === Node.ELEMENT_NODE) {
          const el = c;
          if (el.tagName === 'A') return;
          walk(el);
        }
      });
    })(tpl.content);

    return tpl.innerHTML;
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
      const plain = htmlToPlainText(it.content || '');
      m.textContent = plain ? (plain.length > 120 ? `${plain.slice(0, 120)}…` : plain) : '(空内容)';
      const d = document.createElement('div');
      d.className = 'd';
      d.textContent = `${fmt(it.created_at)}  |  id: ${it.id}`;

      const detail = document.createElement('div');
      detail.className = 'detail';
      detail.hidden = true;
      const rawBox = document.createElement('div');
      rawBox.className = 'raw';
      rawBox.textContent = plain || '';
      detail.appendChild(rawBox);

      div.appendChild(t);
      div.appendChild(m);
      div.appendChild(d);
      div.appendChild(detail);

      div.addEventListener('click', () => {
        detail.hidden = !detail.hidden;
      });

      historyEl.appendChild(div);
    });
  }

  function exec(cmd) {
    restoreSelection();
    try { document.execCommand(cmd); } catch {}
    try { contentEl.focus(); } catch {}
    saveSelection();
  }

  function execColor(hex) {
    restoreSelection();
    try { document.execCommand('foreColor', false, hex); } catch {}
    try { contentEl.focus(); } catch {}
    saveSelection();
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
      restoreSelection();
      document.execCommand('createLink', false, u);
      const sel = window.getSelection();
      const a = sel && sel.anchorNode ? sel.anchorNode.parentElement : null;
      if (a && a.tagName === 'A') {
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener noreferrer');
      }
    } catch {}
    try { contentEl.focus(); } catch {}
    saveSelection();
  }

  function insertTextAtCursor(text) {
    restoreSelection();
    try { document.execCommand('insertText', false, text); } catch {}
    try { contentEl.focus(); } catch {}
    saveSelection();
  }

  function initEmojiPanel() {
    if (!emojiPanel || !toolEmoji) return;
    const emojis = [
      '😀','😁','😂','🤣','😊','😍','😘','😎','🤔','😭',
      '😡','👍','👎','👏','🙏','🔥','🎉','✅','❌','⭐',
      '📌','📣','🔔','⚠️','💡','🧩','🧠','📝','📷','🖼️'
    ];
    emojiPanel.innerHTML = '';
    emojis.forEach((e) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'emoji-btn';
      b.textContent = e;
      b.addEventListener('click', () => insertTextAtCursor(e));
      emojiPanel.appendChild(b);
    });
  }

  function insertImageDataUrl(dataUrl) {
    const wrap = document.createElement('span');
    wrap.setAttribute('contenteditable', 'false');
    wrap.tabIndex = 0;
    wrap.style.display = 'inline-block';
    wrap.style.width = '320px';
    wrap.style.height = '220px';
    wrap.style.resize = 'both';
    wrap.style.overflow = 'hidden';
    wrap.style.borderRadius = '12px';
    wrap.style.border = '1px solid rgba(102,126,234,0.18)';
    wrap.style.boxShadow = '0 10px 24px rgba(0,0,0,0.10)';
    wrap.style.margin = '10px 0';
    wrap.style.background = 'rgba(255,255,255,0.6)';
    const img = document.createElement('img');
    img.src = dataUrl;
    img.alt = 'image';
    wrap.appendChild(img);
    const br = document.createElement('div');
    br.innerHTML = '<br>';
    contentEl.appendChild(wrap);
    contentEl.appendChild(br);
    try { wrap.focus(); } catch {}
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
    const content = autoLinkifyEditorHtml((contentEl.innerHTML || '').trim());
    if (!title && !content) {
      setErr(publishError, '标题/内容至少填一个');
      return;
    }
    publishBtn.disabled = true;
    try {
      await api('/api/publish', { method: 'POST', body: { title, content } });
      titleEl.value = '';
      contentEl.innerHTML = '';
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
    contentEl.addEventListener('keyup', saveSelection);
    contentEl.addEventListener('mouseup', saveSelection);
    contentEl.addEventListener('focus', saveSelection);
  }

  if (toolColor) {
    toolColor.addEventListener('mousedown', () => {
      saveSelection();
    });
  }

  // Prevent toolbar click from stealing focus/selection
  [toolBold, toolItalic, toolUnderline, toolLink, toolEmoji].filter(Boolean).forEach((el) => {
    el.addEventListener('mousedown', (e) => e.preventDefault());
  });

  if (toolBold) toolBold.addEventListener('click', () => exec('bold'));
  if (toolItalic) toolItalic.addEventListener('click', () => exec('italic'));
  if (toolUnderline) toolUnderline.addEventListener('click', () => exec('underline'));
  if (toolLink) toolLink.addEventListener('click', insertLink);

  if (toolEmoji && emojiPanel) {
    initEmojiPanel();
    toolEmoji.addEventListener('click', () => {
      const open = !emojiPanel.hidden;
      emojiPanel.hidden = open;
      toolEmoji.setAttribute('aria-expanded', open ? 'false' : 'true');
      try { contentEl.focus(); } catch {}
      saveSelection();
    });
  }

  if (toolColor) {
    toolColor.addEventListener('input', () => {
      const v = String(toolColor.value || '#111827');
      execColor(v.trim());
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
