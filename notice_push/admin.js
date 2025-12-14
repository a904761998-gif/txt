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
  const emojiPop = document.getElementById('emoji-pop');
  const emojiPanel = document.getElementById('emoji-panel');
  const emojiSearch = document.getElementById('emoji-search');
  const emojiPreview = document.getElementById('emoji-preview');
  const historyBtn = document.getElementById('history-btn');
  const historyModal = document.getElementById('history-modal');
  const historyClose = document.getElementById('history-close');
  const historySearch = document.getElementById('history-search');

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

  function openHistory() {
    if (!historyModal) return;
    historyModal.hidden = false;
    historyModal.setAttribute('aria-hidden', 'false');
  }

  function closeHistory() {
    if (!historyModal) return;
    historyModal.hidden = true;
    historyModal.setAttribute('aria-hidden', 'true');
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
    const items = [
      { t: '😀', k: ['smile','happy','笑'] }, { t: '😁', k: ['grin','笑'] }, { t: '😂', k: ['joy','笑哭'] }, { t: '🤣', k: ['rofl','笑哭'] },
      { t: '😊', k: ['blush','微笑'] }, { t: '😍', k: ['love','heart','爱'] }, { t: '😘', k: ['kiss','亲'] }, { t: '😎', k: ['cool','酷'] },
      { t: '🤔', k: ['think','思考'] }, { t: '😭', k: ['cry','哭'] }, { t: '😡', k: ['angry','生气'] }, { t: '😴', k: ['sleep','困'] },
      { t: '👍', k: ['ok','like','赞'] }, { t: '👎', k: ['dislike','踩'] }, { t: '👏', k: ['clap','鼓掌'] }, { t: '🙏', k: ['pray','谢谢'] },
      { t: '🔥', k: ['fire','hot','火'] }, { t: '🎉', k: ['party','庆祝'] }, { t: '✅', k: ['check','正确'] }, { t: '❌', k: ['x','错误'] },
      { t: '⭐', k: ['star','收藏'] }, { t: '⚠️', k: ['warn','警告'] }, { t: '💡', k: ['idea','灵感'] }, { t: '🧠', k: ['brain','思维'] },
      { t: '📝', k: ['note','笔记'] }, { t: '📌', k: ['pin','置顶'] }, { t: '📣', k: ['announce','公告'] }, { t: '🔔', k: ['bell','通知'] },
      { t: '📷', k: ['photo','图片'] }, { t: '🖼️', k: ['image','图片'] }, { t: '🧩', k: ['puzzle','模块'] }, { t: '🚀', k: ['rocket','上线'] },
      { t: '🧪', k: ['test','测试'] }, { t: '🛠️', k: ['tool','工具'] }, { t: '🔧', k: ['fix','修复'] }, { t: '✨', k: ['sparkle','优化'] },
      { t: '💬', k: ['chat','聊天'] }, { t: '📎', k: ['attach','附件'] }, { t: '📦', k: ['package','发布'] }, { t: '🧹', k: ['clean','清理'] },
      { t: '🎯', k: ['target','目标'] }, { t: '📈', k: ['chart','增长'] }, { t: '📉', k: ['down','下降'] }, { t: '🧡', k: ['heart','爱'] },
      { t: '💚', k: ['heart','爱'] }, { t: '💙', k: ['heart','爱'] }, { t: '💜', k: ['heart','爱'] }, { t: '🤝', k: ['handshake','合作'] },
      { t: '👀', k: ['see','看'] }, { t: '🧑‍💻', k: ['dev','开发'] }, { t: '🧑‍🎨', k: ['design','设计'] }, { t: '🧑‍🚀', k: ['launch','上线'] }
    ];

    const render = (q) => {
      const query = String(q || '').trim().toLowerCase();
      emojiPanel.innerHTML = '';
      const filtered = !query ? items : items.filter(i => i.k.some(k => String(k).toLowerCase().includes(query)) || i.t.includes(query));
      filtered.forEach((it) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'emoji-btn';
        b.textContent = it.t;
        b.addEventListener('mouseenter', () => {
          if (!emojiPreview) return;
          emojiPreview.hidden = false;
          emojiPreview.textContent = it.t;
        });
        b.addEventListener('mouseleave', () => {
          if (!emojiPreview) return;
          emojiPreview.hidden = true;
        });
        b.addEventListener('click', () => {
          insertTextAtCursor(it.t);
          if (emojiPop) emojiPop.hidden = true;
          if (toolEmoji) toolEmoji.setAttribute('aria-expanded', 'false');
        });
        emojiPanel.appendChild(b);
      });
    };

    render('');

    if (emojiSearch) {
      emojiSearch.addEventListener('input', () => render(emojiSearch.value));
    }
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

  if (toolEmoji && emojiPop && emojiPanel) {
    initEmojiPanel();
    toolEmoji.addEventListener('click', () => {
      const open = !emojiPop.hidden;
      emojiPop.hidden = open;
      toolEmoji.setAttribute('aria-expanded', open ? 'false' : 'true');
      try { contentEl.focus(); } catch {}
      saveSelection();
      if (!open && emojiSearch) {
        emojiSearch.value = '';
        emojiSearch.focus();
        emojiSearch.dispatchEvent(new Event('input'));
      }
    });

    document.addEventListener('click', (e) => {
      if (!emojiPop || emojiPop.hidden) return;
      const path = e.composedPath();
      if (path.includes(emojiPop) || path.includes(toolEmoji)) return;
      emojiPop.hidden = true;
      toolEmoji.setAttribute('aria-expanded', 'false');
    });
  }

  if (historyBtn && historyModal) {
    historyBtn.addEventListener('click', async () => {
      openHistory();
      try { await loadHistory(); } catch {}
      if (historySearch) historySearch.value = '';
    });
  }

  if (historyClose) historyClose.addEventListener('click', closeHistory);

  if (historyModal) {
    historyModal.addEventListener('click', (e) => {
      const t = e.target;
      if (t && t.dataset && t.dataset.close) closeHistory();
    });
  }

  if (historySearch) {
    historySearch.addEventListener('input', async () => {
      try {
        const data = await api('/api/list');
        const q = String(historySearch.value || '').trim().toLowerCase();
        const items = (data.items || []).filter((it) => {
          const title = String(it.title || '').toLowerCase();
          const plain = htmlToPlainText(it.content || '').toLowerCase();
          return !q || title.includes(q) || plain.includes(q);
        });
        renderHistory(items);
      } catch {}
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
