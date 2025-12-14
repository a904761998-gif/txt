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
  const noticeDragHandle = document.getElementById('notice-drag-handle');
  const noticeTitle = document.getElementById('notice-title');
  const noticeMeta = document.getElementById('notice-meta');
  const noticeBody = document.getElementById('notice-body');
  const noticeOk = document.getElementById('notice-ok');
  const noticeClose = document.getElementById('notice-close');
  const iframeContainer = document.querySelector('.iframe-container');
  const imgLightbox = document.getElementById('img-lightbox');
  const imgLightboxImg = document.getElementById('img-lightbox-img');
  let showing = 'markdown';
  let currentTheme = null;

  const NOTICE_API_BASE = 'https://txt-ten-smoky.vercel.app';
  const NOTICE_READ_KEY = 'notice_read_id_v1';
  const NOTICE_POS_KEY = 'notice_pop_pos_v1';
  let latestNotice = null;

  function syncThemeToFrame(frameEl) {
    if (!frameEl || !frameEl.contentWindow || !currentTheme) return;
    try {
      frameEl.contentWindow.postMessage({ type: 'set-theme', theme: `theme-${currentTheme}` }, '*');
    } catch {
    }
  }

  [markdown, diff, chat, json, dialogue].forEach((f) => {
    if (!f) return;
    f.addEventListener('load', () => syncThemeToFrame(f));
  });

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
    { id: 'mint', label: '薄荷（默认）' , preview: 'linear-gradient(135deg, #66bb6a, #26a69a)' }
  ];

  function applyTheme(id) {
    const cls = `theme-${id}`;
    if (currentTheme) document.body.classList.remove(`theme-${currentTheme}`);
    currentTheme = id;
    document.body.classList.add(cls);
    try { localStorage.setItem('sidebar_theme_v1', id); } catch {}
    [markdown, diff, chat, json, dialogue].forEach((f) => syncThemeToFrame(f));
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
    // 默认主题为薄荷；如你之前手动选择过其它主题，则继续使用你保存的主题
    const saved = (() => { try { return localStorage.getItem('sidebar_theme_v1'); } catch { return null; } })();
    if (saved && THEMES.some(t => t.id === saved)) applyTheme(saved);
    else applyTheme('mint');
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
    if (!on) {
      try {
        const ae = document.activeElement;
        if (ae && noticePop.contains(ae)) ae.blur();
      } catch {}
    }
    if (on) {
      // Reset any previous inline positioning so the popup won't drift and block the toolbar.
      try { noticePop.style.left = ''; } catch {}
      try { noticePop.style.top = ''; } catch {}
      try { noticePop.style.right = ''; } catch {}
      try { noticePop.style.transform = ''; } catch {}
    }
    noticePop.hidden = !on;
    noticePop.classList.toggle('open', !!on);
    noticePop.setAttribute('aria-hidden', on ? 'false' : 'true');
  }

  function centerNoticeInContainer() {
    if (!noticePop) return;
    const c = iframeContainer || document.body;
    const rect = c.getBoundingClientRect();
    const w = noticePop.offsetWidth || 320;
    const h = noticePop.offsetHeight || 320;
    const x = rect.left + (rect.width - w) / 2;
    const y = rect.top + (rect.height - h) / 2;
    noticePop.style.left = `${Math.round(x)}px`;
    noticePop.style.top = `${Math.round(y)}px`;
    noticePop.style.right = 'auto';
  }

  function sanitizeHtml(raw) {
    const s = String(raw || '');
    const tpl = document.createElement('template');
    tpl.innerHTML = s;
    const allowedTags = new Set([
      'A', 'BR', 'P', 'DIV', 'SPAN', 'STRONG', 'B', 'EM', 'I',
      'UL', 'OL', 'LI', 'IMG', 'CODE', 'PRE', 'FONT'
    ]);
    const allowedAttrs = new Set(['href', 'target', 'rel', 'src', 'alt', 'color']);

    (function walk(node) {
      const children = Array.from(node.childNodes);
      children.forEach((c) => {
        if (c.nodeType === Node.ELEMENT_NODE) {
          const el = c;
          if (!allowedTags.has(el.tagName)) {
            const frag = document.createDocumentFragment();
            while (el.firstChild) frag.appendChild(el.firstChild);
            el.replaceWith(frag);
            walk(frag);
            return;
          }
          Array.from(el.attributes).forEach((a) => {
            if (!allowedAttrs.has(a.name)) el.removeAttribute(a.name);
          });
          if (el.tagName === 'A') {
            const href = el.getAttribute('href') || '';
            if (!/^https?:\/\//i.test(href)) el.removeAttribute('href');
            el.setAttribute('target', '_blank');
            el.setAttribute('rel', 'noopener noreferrer');
          }
          if (el.tagName === 'FONT') {
            const c = el.getAttribute('color') || '';
            if (c && !/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c) && !/^(rgb|rgba)\(/i.test(c)) {
              el.removeAttribute('color');
            }
          }
          if (el.tagName === 'IMG') {
            const src = el.getAttribute('src') || '';
            if (!/^data:image\//i.test(src) && !/^https?:\/\//i.test(src)) {
              el.remove();
              return;
            }
            if (!el.getAttribute('alt')) el.setAttribute('alt', 'image');
          }
          walk(el);
        }
      });
    })(tpl.content);

    return tpl.innerHTML;
  }

  function linkifyHtml(html) {
    const s = String(html || '');
    const re = /((https?:\/\/)[^\s<]+|www\.[^\s<]+)/gi;
    return s.replace(re, (m) => {
      const href = /^https?:\/\//i.test(m) ? m : `https://${m}`;
      const safe = href.replace(/"/g, '%22');
      return `<a href="${safe}" target="_blank" rel="noopener noreferrer">${m}</a>`;
    });
  }

  function normalizePlainText(s) {
    const t = String(s || '');
    const html = t
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
    return linkifyHtml(html);
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
    const raw = item.content || '';
    const looksHtml = /<\s*(a|img|div|p|br|span|strong|em|ul|ol|li|pre|code)\b/i.test(raw);
    const html = looksHtml ? sanitizeHtml(raw) : normalizePlainText(raw);
    noticeBody.innerHTML = html;

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

  function animateMinimizeToBell() {
    if (!noticeBtn || !noticePop || noticePop.hidden) return;
    const card = noticePop.querySelector('.notice-card');
    if (!card) return;
    const from = card.getBoundingClientRect();
    const to = noticeBtn.getBoundingClientRect();
    const clone = card.cloneNode(true);
    clone.style.position = 'fixed';
    clone.style.left = `${from.left}px`;
    clone.style.top = `${from.top}px`;
    clone.style.width = `${from.width}px`;
    clone.style.height = `${from.height}px`;
    clone.style.margin = '0';
    clone.style.zIndex = '9999';
    clone.style.transform = 'translate(0,0) scale(1)';
    clone.style.opacity = '1';
    clone.style.transition = 'transform 420ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 420ms cubic-bezier(0.2, 0.8, 0.2, 1)';
    document.body.appendChild(clone);

    const dx = (to.left + to.width / 2) - (from.left + from.width / 2);
    const dy = (to.top + to.height / 2) - (from.top + from.height / 2);

    requestAnimationFrame(() => {
      clone.style.transform = `translate(${dx}px, ${dy}px) scale(0.15)`;
      clone.style.opacity = '0';
    });

    const done = () => {
      clone.removeEventListener('transitionend', done);
      clone.remove();
    };
    clone.addEventListener('transitionend', done);
    setTimeout(() => { try { clone.remove(); } catch {} }, 900);
  }

  function markReadAndMinimize() {
    if (!latestNotice || !latestNotice.id) {
      setPopOpen(false);
      return;
    }
    animateMinimizeToBell();
    setReadId(latestNotice.id);
    setNoticePulse(false);
    setPopOpen(false);
    setNoticeBtnVisible(true);
  }

  function loadNoticePos() {
    try {
      const raw = localStorage.getItem(NOTICE_POS_KEY);
      if (!raw) return null;
      const v = JSON.parse(raw);
      if (!v || typeof v.x !== 'number' || typeof v.y !== 'number') return null;
      return v;
    } catch {
      return null;
    }
  }

  function saveNoticePos(x, y) {
    try { localStorage.setItem(NOTICE_POS_KEY, JSON.stringify({ x, y })); } catch {}
  }

  function applyNoticePos(pos) {
    if (!noticePop || !pos) return;
    noticePop.style.transform = 'none';
    noticePop.style.left = `${pos.x}px`;
    noticePop.style.top = `${pos.y}px`;
    noticePop.style.right = 'auto';
  }

  function clampNoticePos(x, y) {
    const w = noticePop ? noticePop.offsetWidth : 360;
    const h = noticePop ? noticePop.offsetHeight : 420;
    const pad = 12;
    const maxX = Math.max(pad, window.innerWidth - w - pad);
    const maxY = Math.max(pad, window.innerHeight - h - pad);
    return {
      x: Math.max(pad, Math.min(x, maxX)),
      y: Math.max(pad, Math.min(y, maxY))
    };
  }

  function initDrag() {
    // Disabled: dragging/position persistence caused overlay & click-blocking regressions.
    // We keep the handler in place so existing calls won't crash.
  }

  if (imgLightbox && imgLightboxImg && noticeBody) {
    noticeBody.addEventListener('click', (e) => {
      const t = e.target;
      if (!t || t.tagName !== 'IMG') return;
      const src = t.getAttribute('src') || '';
      if (!src) return;
      imgLightboxImg.src = src;
      imgLightbox.hidden = false;
      imgLightbox.setAttribute('aria-hidden', 'false');
    });

    imgLightbox.addEventListener('click', (e) => {
      const t = e.target;
      if (t && t.dataset && t.dataset.close) {
        imgLightbox.hidden = true;
        imgLightbox.setAttribute('aria-hidden', 'true');
        imgLightboxImg.removeAttribute('src');
      }
    });
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
  // NOTE: Global scaling temporarily disabled to avoid interaction regressions.
  initDrag();
  fetchLatestNotice();
})();
