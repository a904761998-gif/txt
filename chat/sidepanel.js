document.addEventListener('DOMContentLoaded', () => {
  const apiBaseEl = document.getElementById('api-base');
  const apiKeyEl = document.getElementById('api-key');
  const modelEl = document.getElementById('model');
  const saveBtn = document.getElementById('save-settings');
  const messagesEl = document.getElementById('messages');
  const inputEl = document.getElementById('input');
  const sendBtn = document.getElementById('send');
  const clearBtn = document.getElementById('clear');
  const statusEl = document.getElementById('status');
  const inputResizerEl = document.getElementById('input-resizer');
  const inlineSettingsEl = document.getElementById('inline-settings');
  const toggleSettingsBtn = document.getElementById('toggle-settings');

  const STORAGE_KEY = 'llm_settings_v1';
  const CHAT_KEY = 'llm_chat_history_v1';
  let messages = loadChat();
  renderMessages();

  const settings = loadSettings();
  apiBaseEl.value = settings.apiBase || '';
  apiKeyEl.value = settings.apiKey || '';
  modelEl.value = settings.model || '';

  saveBtn.addEventListener('click', () => {
    saveSettings({ apiBase: apiBaseEl.value.trim(), apiKey: apiKeyEl.value.trim(), model: modelEl.value.trim() });
    statusEl.textContent = '保存成功';
    statusEl.style.opacity = '1';
    setTimeout(() => { statusEl.textContent = ''; statusEl.style.opacity = '0'; inlineSettingsEl.classList.remove('open'); }, 2000);
  });

  toggleSettingsBtn.addEventListener('click', () => {
    inlineSettingsEl.classList.toggle('open');
  });

  async function handleSend() {
    const content = inputEl.value.trim();
    if (!content) return;
    const s = loadSettings();
    addMessage('user', content);
    inputEl.value = '';
    showThinking();
    try {
      const reply = await callChatAPI(s.apiBase, s.apiKey, s.model, messages);
      addMessage('assistant', reply);
    } catch (e) {
      addMessage('assistant', `错误: ${e.message || e}`);
    } finally { hideThinking(); }
  }
  sendBtn.addEventListener('click', handleSend);
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      handleSend();
    }
  });

  clearBtn.addEventListener('click', () => {
    messages = [];
    saveChat(messages);
    renderMessages();
  });

  function loadSettings() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
  }
  function saveSettings(s) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  }
  function loadChat() {
    try { return JSON.parse(localStorage.getItem(CHAT_KEY) || '[]'); } catch { return []; }
  }
  function saveChat(arr) {
    localStorage.setItem(CHAT_KEY, JSON.stringify(arr));
  }
  function addMessage(role, content) {
    messages.push({ role, content });
    saveChat(messages);
    renderMessages();
  }
  function renderMessages() {
    messagesEl.innerHTML = '';
    let lastAssistantIdx = -1;
    for (let i = messages.length - 1; i >= 0; i--) { if (messages[i].role === 'assistant') { lastAssistantIdx = i; break; } }
    messages.forEach((m, idx) => {
      const row = document.createElement('div');
      row.className = `msg ${m.role}`;
      const avatar = document.createElement('div');
      avatar.className = `avatar ${m.role}`;
      avatar.textContent = m.role === 'user' ? 'U' : 'M';
      const bubble = document.createElement('div');
      bubble.className = 'bubble';
      const contentEl = document.createElement('div');
      if (m.role === 'assistant' && window.marked) {
        contentEl.innerHTML = window.marked.parse(m.content);
      } else {
        contentEl.textContent = m.content;
      }
      bubble.appendChild(contentEl);
      if (m.role === 'assistant') {
        const actions = document.createElement('div');
        actions.className = 'actions';
        const copyBtn = document.createElement('button');
        copyBtn.textContent = '复制';
        copyBtn.addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(m.content);
            const prev = copyBtn.textContent;
            copyBtn.textContent = '已复制';
            copyBtn.classList.add('copied');
            setTimeout(() => { copyBtn.textContent = prev; copyBtn.classList.remove('copied'); }, 1500);
          } catch {}
        });
        actions.appendChild(copyBtn);
        if (idx === lastAssistantIdx) {
          const regenBtn = document.createElement('button');
          regenBtn.textContent = '重新生成';
          regenBtn.addEventListener('click', async () => {
            messages.splice(idx, 1);
            saveChat(messages);
            renderMessages();
            const s = loadSettings();
            showThinking();
            try {
              const reply = await callChatAPI(s.apiBase, s.apiKey, s.model, messages);
              addMessage('assistant', reply);
            } catch (e) {
              addMessage('assistant', `错误: ${e.message || e}`);
            } finally { hideThinking(); }
          });
          actions.appendChild(regenBtn);
        }
        bubble.appendChild(actions);
      }
      if (m.role === 'assistant') { row.appendChild(avatar); row.appendChild(bubble); }
      else { row.appendChild(bubble); row.appendChild(avatar); }
      messagesEl.appendChild(row);
    });
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  async function callChatAPI(apiBase, apiKey, model, msgs) {
    if (!apiBase || !apiKey || !model) throw new Error('请先填写 API Base、API Key 与模型');
    const url = apiBase.replace(/\/$/, '') + '/v1/chat/completions';
    const body = { model, messages: msgs.map(m => ({ role: m.role, content: m.content })) };
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || ('HTTP ' + res.status));
    }
    const data = await res.json();
    const choice = data.choices && data.choices[0];
    const content = choice && choice.message && choice.message.content;
    return content || '';
  }
  let resizing = false;
  let startY = 0;
  let startHeight = 0;
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  inputResizerEl.addEventListener('pointerdown', (e) => {
    resizing = true;
    startY = e.clientY;
    startHeight = inputEl.offsetHeight;
    inputResizerEl.setPointerCapture(e.pointerId);
  });
  inputResizerEl.addEventListener('pointermove', (e) => {
    if (!resizing) return;
    const delta = e.clientY - startY;
    const next = clamp(startHeight - delta, 80, Math.round(window.innerHeight * 0.5));
    inputEl.style.height = next + 'px';
  });
  inputResizerEl.addEventListener('pointerup', () => {
    resizing = false;
  });

  let thinkingEl = null;
  function showThinking() {
    if (thinkingEl) return;
    const row = document.createElement('div');
    row.className = 'msg assistant';
    const avatar = document.createElement('div');
    avatar.className = 'avatar assistant';
    avatar.textContent = 'M';
    const bubble = document.createElement('div');
    bubble.className = 'bubble thinking';
    const dots = document.createElement('div');
    dots.className = 'dots';
    dots.innerHTML = '<span></span><span></span><span></span>';
    bubble.appendChild(dots);
    row.appendChild(avatar);
    row.appendChild(bubble);
    messagesEl.appendChild(row);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    thinkingEl = row;
  }
  function hideThinking() { if (!thinkingEl) return; thinkingEl.remove(); thinkingEl = null; }

  function setThemeClass(cls) {
    const prev = Array.from(document.body.classList).find(c => c.startsWith('theme-'));
    if (prev) document.body.classList.remove(prev);
    if (cls) document.body.classList.add(cls);
  }
  window.addEventListener('message', (e) => {
    const d = e.data || {};
    if (d.type === 'set-theme' && typeof d.theme === 'string') setThemeClass(d.theme);
  });
});
