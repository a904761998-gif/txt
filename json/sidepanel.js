document.addEventListener('DOMContentLoaded', () => {
    const inputEl = document.getElementById('jsonInput');
    const outputEl = document.getElementById('renderArea');
    const statusEl = document.getElementById('jsonStatus');
    const btnPrettify = document.getElementById('btn-prettify');
    const btnMinify = document.getElementById('btn-minify');
    const btnCopy = document.getElementById('btn-copy');
    const btnClear = document.getElementById('btn-clear');
    const resizer = document.getElementById('resizer');
    const leftPane = document.querySelector('.pane-left');
    const rightPane = document.querySelector('.pane-right');
    let resizing = false;
    let lastRenderedText = '';
    function j_mm(e){
        if(!resizing) return;
        const container = leftPane.parentElement;
        const rect = container.getBoundingClientRect();
        const resizerW = resizer.offsetWidth || 6;
        const x = e.clientX - rect.left;
        const total = rect.width;
        const maxLeft = Math.max(0, total - resizerW);
        const leftW = Math.max(0, Math.min(x, maxLeft));
        const rightW = Math.max(0, total - leftW - resizerW);
        leftPane.style.width = '';
        rightPane.style.width = '';
        leftPane.style.flex = `0 0 ${leftW}px`;
        rightPane.style.flex = `1 1 ${rightW}px`;
    }
    function j_mu(){ resizing=false; document.body.style.cursor='default'; document.body.style.userSelect='auto'; document.removeEventListener('mousemove', j_mm); document.removeEventListener('mouseup', j_mu); }
    resizer.addEventListener('mousedown', ()=>{ resizing=true; document.body.style.cursor='col-resize'; document.body.style.userSelect='none'; document.addEventListener('mousemove', j_mm); document.addEventListener('mouseup', j_mu); });

    const defaultData = `{
    "调整点1": {
        "操作类型": "删除",
        "原文内容": "图片中展示的植物为",
        "判断逻辑": "根据限制规则1，禁止出现无意义信息。",
        "重写结果": ""
    },
    "调整点2": {
        "操作类型": "修正",
        "原文内容": "又称火炭草、石莽草、小红太阳草",
        "判断逻辑": "“小红太阳草”权重不足，删除。",
        "重写结果": "又称火炭草、石莽草"
    },
    "最终结果": "头花蓼（学名：Persicaria capitata）..."
}`;

    // 初始化
    inputEl.value = defaultData;
    processInput();

    // 监听输入变化
    inputEl.addEventListener('input', processInput);

    // 粘贴一行压缩 JSON 时自动美化
    inputEl.addEventListener('paste', () => {
        setTimeout(() => {
            tryAutoPrettify();
            processInput();
        }, 0);
    });

    if (btnPrettify) btnPrettify.addEventListener('click', () => {
        try {
            const data = parseLooseJSON(inputEl.value.trim());
            inputEl.value = JSON.stringify(data, null, 2);
            processInput();
        } catch (e) {
            processInput();
        }
    });

    if (btnMinify) btnMinify.addEventListener('click', () => {
        try {
            const data = parseLooseJSON(inputEl.value.trim());
            inputEl.value = JSON.stringify(data);
            processInput();
        } catch (e) {
            processInput();
        }
    });

    if (btnCopy) btnCopy.addEventListener('click', async () => {
        const text = String(lastRenderedText || '').trim();
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            statusEl.textContent = '已复制';
            statusEl.className = 'status valid';
            setTimeout(() => {
                try { processInput(); } catch {}
            }, 700);
        } catch {
            try {
                const ta = document.createElement('textarea');
                ta.value = text;
                ta.style.position = 'fixed';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                ta.remove();
                statusEl.textContent = '已复制';
                statusEl.className = 'status valid';
                setTimeout(() => {
                    try { processInput(); } catch {}
                }, 700);
            } catch {
            }
        }
    });

    if (btnClear) btnClear.addEventListener('click', () => {
        inputEl.value = '';
        lastRenderedText = '';
        outputEl.textContent = '请在左侧粘贴数据';
        outputEl.classList.add('placeholder');
        statusEl.textContent = '空';
        statusEl.className = 'status';
        inputEl.focus();
    });

    function processInput() {
        const rawText = inputEl.value.trim();
        if (!rawText) {
            lastRenderedText = '';
            outputEl.textContent = '请在左侧粘贴数据';
            outputEl.classList.add('placeholder');
            statusEl.textContent = '空';
            statusEl.className = 'status';
            return;
        }

        try {
            const data = parseLooseJSON(rawText);
            statusEl.textContent = 'JSON 有效';
            statusEl.className = 'status valid';
            renderJSON(data);
        } catch (e) {
            const msg = (e && e.message) ? String(e.message) : String(e);
            const pos = extractJsonErrorPos(e);
            const lc = pos != null ? lineColFromPos(rawText, pos) : null;
            statusEl.textContent = lc ? `格式错误：第 ${lc.line} 行，第 ${lc.col} 列` : ('格式错误: ' + msg);
            statusEl.className = 'status error';
            outputEl.innerHTML = `<div class="json-error">
  <div class="json-error-title">解析失败</div>
  <div class="json-error-msg">${escapeHtml(lc ? `第 ${lc.line} 行，第 ${lc.col} 列\n${msg}` : msg)}</div>
  <div class="json-error-tip">请检查：引号、逗号、括号是否缺失或多余；如从 Markdown 复制请确保代码块边界正确。</div>
</div>`;

            lastRenderedText = '';
            outputEl.classList.remove('placeholder');
            if (pos != null) highlightErrorAt(pos);
        }
    }

    function tryAutoPrettify() {
        const raw = inputEl.value;
        const text = String(raw || '').trim();
        if (!text) return;
        // 仅当没有换行且看起来像 JSON 时才自动美化
        if (/[\r\n]/.test(text)) return;
        if (!/^\s*[\[{]/.test(text)) return;
        try {
            const data = parseLooseJSON(text);
            inputEl.value = JSON.stringify(data, null, 2);
        } catch {
        }
    }

    function extractJsonErrorPos(err) {
        const m = String((err && err.message) ? err.message : '').match(/position\s+(\d+)/i);
        if (!m) return null;
        const p = Number(m[1]);
        return Number.isFinite(p) ? p : null;
    }

    function lineColFromPos(text, pos) {
        const s = String(text || '');
        const p = Math.max(0, Math.min(Number(pos) || 0, s.length));
        let line = 1;
        let lastNl = -1;
        for (let i = 0; i < p; i++) {
            const ch = s.charCodeAt(i);
            if (ch === 10) { // \n
                line += 1;
                lastNl = i;
            }
        }
        const col = p - lastNl;
        return { line, col };
    }

    function highlightErrorAt(pos) {
        try {
            const p = Math.max(0, Math.min(Number(pos) || 0, inputEl.value.length));
            inputEl.focus();
            inputEl.setSelectionRange(p, Math.min(p + 1, inputEl.value.length));
            // 尝试滚动到错误附近
            const before = inputEl.value.slice(0, p);
            const line = before.split(/\r\n|\n|\r/).length;
            const lineHeight = 20;
            inputEl.scrollTop = Math.max(0, (line - 3) * lineHeight);
        } catch {
        }
    }

    function parseLooseJSON(text) {
        // 1. 移除 Markdown 代码块标记
        text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '');

        // 2. 【关键修复】清洗特殊空白字符
        // 将 不换行空格(\u00A0)、全角空格(\u3000)、零宽空格(\u200B) 替换为普通空格
        text = text.replace(/[\u00A0\u3000\u200B]/g, ' ');

        // 3. 尝试标准解析
        try {
            return JSON.parse(text);
        } catch (e) {
            // 4. 容错解析：使用 Function 构造函数处理非标准格式（单引号、末尾逗号等）
            try {
                const func = new Function("return " + text);
                return func();
            } catch (e2) {
                throw e; 
            }
        }
    }

    function renderJSON(data) {
        lastRenderedText = JSON.stringify(data, null, 2);
        outputEl.classList.remove('placeholder');
        outputEl.innerHTML = `<div class="json-view json-code">${renderValue(data, 0, true)}</div>`;
    }

    function renderValue(value, depth, isRoot = false) {
        if (value === null) return `<span class="json-null">null</span>`;
        if (value === undefined) return `<span class="json-undefined">undefined</span>`;

        const t = typeof value;
        if (t === 'string') return `<span class="json-string">"${escapeHtml(value)}"</span>`;
        if (t === 'number') return `<span class="json-number">${Number.isFinite(value) ? String(value) : escapeHtml(String(value))}</span>`;
        if (t === 'boolean') return `<span class="json-boolean">${value}</span>`;
        if (t !== 'object') return `<span class="json-default">${escapeHtml(String(value))}</span>`;

        if (Array.isArray(value)) return renderArray(value, depth, isRoot);
        return renderObject(value, depth, isRoot);
    }

    function renderArray(arr, depth, isRoot) {
        if (arr.length === 0) {
            return `<span class="json-punct">[</span><span class="json-punct">]</span>`;
        }
        const children = arr.map((v, idx) => {
            const comma = idx < arr.length - 1 ? '<span class="json-punct">,</span>' : '';
            return `<div class="json-line" style="--json-indent:${depth + 1};">${renderValue(v, depth + 1)}${comma}</div>`;
        }).join('');

        const open = isRoot ? ' open' : '';
        const summary = `<span class="json-punct">[</span><span class="json-fold">…</span><span class="json-punct">]</span><span class="json-meta"> ${arr.length} items</span>`;

        return `<details class="json-details"${open}>
  <summary class="json-summary" style="--json-indent:${depth};">${summary}</summary>
  <div class="json-children">
    <div class="json-line" style="--json-indent:${depth};"><span class="json-punct">[</span></div>
    ${children}
    <div class="json-line" style="--json-indent:${depth};"><span class="json-punct">]</span></div>
  </div>
</details>`;
    }

    function renderObject(obj, depth, isRoot) {
        const keys = Object.keys(obj || {});
        if (keys.length === 0) {
            return `<span class="json-punct">{</span><span class="json-punct">}</span>`;
        }

        const children = keys.map((k, idx) => {
            const comma = idx < keys.length - 1 ? '<span class="json-punct">,</span>' : '';
            const v = obj[k];
            return `<div class="json-line" style="--json-indent:${depth + 1};"><span class="json-key">"${escapeHtml(k)}"</span><span class="json-punct">: </span>${renderValue(v, depth + 1)}${comma}</div>`;
        }).join('');

        const open = isRoot ? ' open' : '';
        const summary = `<span class="json-punct">{</span><span class="json-fold">…</span><span class="json-punct">}</span><span class="json-meta"> ${keys.length} keys</span>`;

        return `<details class="json-details"${open}>
  <summary class="json-summary" style="--json-indent:${depth};">${summary}</summary>
  <div class="json-children">
    <div class="json-line" style="--json-indent:${depth};"><span class="json-punct">{</span></div>
    ${children}
    <div class="json-line" style="--json-indent:${depth};"><span class="json-punct">}</span></div>
  </div>
</details>`;
    }

    function escapeHtml(text) {
        if (typeof text !== 'string') return text;
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

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
