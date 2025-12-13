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
  let showing = 'markdown';
  let currentTheme = null;

  const NOTICE_API_BASE = 'https://txt-ten-smoky.vercel.app';
  const NOTICE_READ_KEY = 'notice_read_id_v1';
  const NOTICE_POS_KEY = 'notice_pop_pos_v1';
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

  function sanitizeHtml(raw) {
    const s = String(raw || '');
    const tpl = document.createElement('template');
    tpl.innerHTML = s;
    const allowedTags = new Set([
      'A', 'BR', 'P', 'DIV', 'SPAN', 'STRONG', 'B', 'EM', 'I',
      'UL', 'OL', 'LI', 'IMG', 'CODE', 'PRE'
    ]);
    const allowedAttrs = new Set(['href', 'target', 'rel', 'src', 'alt', 'style']);

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

  function normalizePlainText(s) {
    const t = String(s || '');
    return t
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
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
    noticePop.style.left = `${pos.x}px`;
    noticePop.style.top = `${pos.y}px`;
    noticePop.style.right = 'auto';
  }

  function clampNoticePos(x, y) {
    const w = noticePop ? noticePop.offsetWidth : 420;
    const h = noticePop ? noticePop.offsetHeight : 220;
    const maxX = Math.max(0, window.innerWidth - w - 8);
    const maxY = Math.max(0, window.innerHeight - h - 8);
    return {
      x: Math.max(8, Math.min(x, maxX)),
      y: Math.max(8, Math.min(y, maxY))
    };
  }

  function initDrag() {
    if (!noticePop || !noticeDragHandle) return;
    const saved = loadNoticePos();
    if (saved) applyNoticePos(saved);

    let dragging = false;
    let startX = 0;
    let startY = 0;
    let baseX = 0;
    let baseY = 0;

    const onMove = (e) => {
      if (!dragging) return;
      const x = baseX + (e.clientX - startX);
      const y = baseY + (e.clientY - startY);
      const p = clampNoticePos(x, y);
      noticePop.style.left = `${p.x}px`;
      noticePop.style.top = `${p.y}px`;
      noticePop.style.right = 'auto';
    };

    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      noticePop.classList.remove('dragging');
      const rect = noticePop.getBoundingClientRect();
      saveNoticePos(rect.left, rect.top);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    noticeDragHandle.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      if (!noticePop || noticePop.hidden) return;
      dragging = true;
      noticePop.classList.add('dragging');
      const rect = noticePop.getBoundingClientRect();
      baseX = rect.left;
      baseY = rect.top;
      startX = e.clientX;
      startY = e.clientY;
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    });

    window.addEventListener('resize', () => {
      const rect = noticePop.getBoundingClientRect();
      const p = clampNoticePos(rect.left, rect.top);
      noticePop.style.left = `${p.x}px`;
      noticePop.style.top = `${p.y}px`;
      noticePop.style.right = 'auto';
      saveNoticePos(p.x, p.y);
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
  initDrag();
  fetchLatestNotice();
})();
