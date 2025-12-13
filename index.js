(() => {
  const select = document.getElementById('tool-select');
  const markdown = document.getElementById('markdown-frame');
  const diff = document.getElementById('diff-frame');
  const chat = document.getElementById('chat-frame');
  const json = document.getElementById('json-frame');
  const dialogue = document.getElementById('dialogue-frame');
  const themeBtn = document.getElementById('theme-btn');
  const themePicker = document.getElementById('theme-picker');
  const noticeBtn = document.getElementById('notice-btn');
  const noticePop = document.getElementById('notice-pop');
  const noticeTitle = document.getElementById('notice-title');
  const noticeMeta = document.getElementById('notice-meta');
  const noticeBody = document.getElementById('notice-body');
  const noticeOk = document.getElementById('notice-ok');
  const noticeClose = document.getElementById('notice-close');
  let showing = 'markdown';
  let currentTheme = null;

  const NOTICE_API_BASE = 'https://txt-ten-smoky.vercel.app';
  const NOTICE_READ_KEY = 'notice_read_id_v1';
  let latestNotice = null;

  function setVisible(id) {
    markdown.classList.toggle('visible', id === 'markdown');
    diff.classList.toggle('visible', id === 'diff');
    chat.classList.toggle('visible', id === 'chat');
    json.classList.toggle('visible', id === 'json');
    dialogue.classList.toggle('visible', id === 'dialogue');
  }

  select.addEventListener('change', () => {
    showing = select.value;
    setVisible(showing);
  });

  setVisible(showing);

  const THEMES = [
    { id: 'aurora', label: '极光' , preview: 'linear-gradient(135deg, #4fc3f7, #ab47bc)' },
    { id: 'sakura', label: '樱花' , preview: 'linear-gradient(135deg, #f48fb1, #ec407a)' },
    { id: 'cyberpunk', label: '赛博朋克' , preview: 'linear-gradient(135deg, #22d3ee, #f43f5e)' },
    { id: 'royal', label: '皇家' , preview: 'linear-gradient(135deg, #ffd700, #c59d5f)' },
    { id: 'mint', label: '薄荷' , preview: 'linear-gradient(135deg, #66bb6a, #26a69a)' }
  ];

  function applyTheme(id) {
    const cls = `theme-${id}`;
    if (currentTheme) document.body.classList.remove(`theme-${currentTheme}`);
    currentTheme = id;
    document.body.classList.add(cls);
    try { localStorage.setItem('sidebar_theme_v1', id); } catch {}
    [markdown, diff, chat, json, dialogue].forEach((f) => {
      if (f && f.contentWindow) {
        f.contentWindow.postMessage({ type: 'set-theme', theme: cls }, '*');
      }
    });
    [...themePicker.querySelectorAll('.theme-card')].forEach((c) => c.classList.toggle('selected', c.dataset.id === id));
  }

  function buildThemePicker() {
    themePicker.innerHTML = '';
    THEMES.forEach(t => {
      const card = document.createElement('div');
      card.className = 'theme-card';
      card.style.background = t.preview;
      card.dataset.id = t.id;
      const label = document.createElement('div');
      label.className = 'label';
      label.textContent = t.label;
      card.appendChild(label);
      card.addEventListener('click', () => { applyTheme(t.id); themePicker.classList.remove('open'); });
      themePicker.appendChild(card);
    });
  }

  function initTheme() {
    buildThemePicker();
    const saved = (() => { try { return localStorage.getItem('sidebar_theme_v1'); } catch { return null; } })();
    if (saved && THEMES.some(t => t.id === saved)) applyTheme(saved);
  }

  function fmtTime(ts) {
    try {
      const d = new Date(ts);
      if (Number.isNaN(d.getTime())) return '';
      return d.toLocaleString();
    } catch {
      return '';
    }
  }

  function getReadId() {
    try { return localStorage.getItem(NOTICE_READ_KEY) || ''; } catch { return ''; }
  }

  function setReadId(id) {
    try { localStorage.setItem(NOTICE_READ_KEY, String(id || '')); } catch {}
  }

  function setNoticeBtnVisible(on) {
    if (!noticeBtn) return;
    noticeBtn.hidden = !on;
  }

  function setNoticePulse(on) {
    if (!noticeBtn) return;
    noticeBtn.classList.toggle('pulse', !!on);
  }

  function setPopOpen(on) {
    if (!noticePop) return;
    noticePop.hidden = !on;
    noticePop.classList.toggle('open', !!on);
    noticePop.setAttribute('aria-hidden', on ? 'false' : 'true');
  }

  function renderNotice(item) {
    latestNotice = item || null;
    if (!item) {
      setNoticeBtnVisible(false);
      setPopOpen(false);
      return;
    }
    setNoticeBtnVisible(true);
    noticeTitle.textContent = item.title || '公告';
    const t = fmtTime(item.created_at);
    noticeMeta.textContent = t ? `发布时间：${t}` : '';
    noticeBody.textContent = item.content || '';

    const readId = getReadId();
    const isUnread = String(item.id) && String(item.id) !== String(readId);
    setNoticePulse(isUnread);
    setPopOpen(isUnread);
  }

  async function fetchLatestNotice() {
    try {
      const res = await fetch(`${NOTICE_API_BASE}/api/latest`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      renderNotice(data && data.item ? data.item : null);
    } catch {
    }
  }

  function markReadAndMinimize() {
    if (!latestNotice || !latestNotice.id) {
      setPopOpen(false);
      return;
    }
    setReadId(latestNotice.id);
    setNoticePulse(false);
    setPopOpen(false);
    setNoticeBtnVisible(true);
  }

  document.addEventListener('click', (e) => {
    if (!themePicker.classList.contains('open')) return;
    const path = e.composedPath();
    if (!path.includes(themePicker) && !path.includes(themeBtn)) themePicker.classList.remove('open');
  });

  document.addEventListener('click', (e) => {
    if (!noticePop || noticePop.hidden) return;
    const path = e.composedPath();
    if (!path.includes(noticePop) && !path.includes(noticeBtn)) setPopOpen(false);
  });

  themeBtn.addEventListener('click', () => {
    themePicker.classList.toggle('open');
  });

  if (noticeBtn) {
    noticeBtn.addEventListener('click', () => {
      if (!latestNotice) return;
      const open = !noticePop.hidden;
      setPopOpen(!open);
      if (!open) themePicker.classList.remove('open');
    });
  }

  if (noticeOk) noticeOk.addEventListener('click', markReadAndMinimize);
  if (noticeClose) noticeClose.addEventListener('click', () => setPopOpen(false));

  initTheme();
  fetchLatestNotice();
})();
