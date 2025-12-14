document.addEventListener('DOMContentLoaded', () => {
    const inputEl = document.getElementById('jsonInput');
    const outputEl = document.getElementById('renderArea');
    const statusEl = document.getElementById('jsonStatus');
    const resizer = document.getElementById('resizer');
    const leftPane = document.querySelector('.pane-left');
    const rightPane = document.querySelector('.pane-right');
    let resizing = false;
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

    function processInput() {
        const rawText = inputEl.value.trim();
        if (!rawText) {
            outputEl.innerHTML = '<div style="text-align: center; color: #9ca3af; margin-top: 3rem;">无内容</div>';
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
            statusEl.textContent = '格式错误: ' + (e.message || e);
            statusEl.className = 'status error';
            outputEl.innerHTML = '<div style="text-align: center; color: #ef4444; margin-top: 3rem; padding: 0 1rem;">解析失败，请检查 JSON 格式</div>';
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
        const lines = formatJsonLines(data, 0);
        outputEl.innerHTML = `<pre class="json-pre">${lines.join('\n')}</pre>`;
    }

    function formatJsonLines(value, depth = 0) {
        const indent = '  '.repeat(depth);

        if (value === null) return [`<span class="json-null">null</span>`];
        if (value === undefined) return [`<span class="json-undefined">undefined</span>`];

        const t = typeof value;
        if (t === 'string') return [`<span class="json-string">"${escapeHtml(value)}"</span>`];
        if (t === 'number') return [`<span class="json-number">${value}</span>`];
        if (t === 'boolean') return [`<span class="json-boolean">${value}</span>`];
        if (t !== 'object') return [`<span class="json-default">${escapeHtml(String(value))}</span>`];

        if (Array.isArray(value)) {
            if (value.length === 0) return ['<span class="json-punct">[</span><span class="json-punct">]</span>'];
            const out = ['<span class="json-punct">[</span>'];
            for (let i = 0; i < value.length; i++) {
                const childLines = formatJsonLines(value[i], depth + 1);
                for (let j = 0; j < childLines.length; j++) {
                    let line = `${indent}  ${childLines[j]}`;
                    if (i < value.length - 1 && j === childLines.length - 1) line += '<span class="json-punct">,</span>';
                    out.push(line);
                }
            }
            out.push(`${indent}<span class="json-punct">]</span>`);
            return out;
        }

        const keys = Object.keys(value);
        if (keys.length === 0) return ['<span class="json-punct">{</span><span class="json-punct">}</span>'];

        const maxKeyW = keys.reduce((m, k) => Math.max(m, displayWidth(k)), 0);

        const out = ['<span class="json-punct">{</span>'];
        for (let i = 0; i < keys.length; i++) {
            const k = keys[i];
            const v = value[k];
            const childLines = formatJsonLines(v, depth + 1);

            const pad = ' '.repeat(Math.max(0, maxKeyW - displayWidth(k)));

            // First line for this property
            out.push(`${indent}  <span class="json-key">"${escapeHtml(k)}"</span>${pad}<span class="json-punct">: </span>${childLines[0]}`);
            // Remaining lines for multiline values
            for (let j = 1; j < childLines.length; j++) {
                out.push(`${indent}  ${childLines[j]}`);
            }

            // Add comma to the last line of this property if not last property
            if (i < keys.length - 1) {
                out[out.length - 1] = out[out.length - 1] + '<span class="json-punct">,</span>';
            }
        }
        out.push(`${indent}<span class="json-punct">}</span>`);
        return out;
    }

    function displayWidth(str) {
        const s = String(str ?? '');
        let w = 0;
        for (const ch of s) {
            const code = ch.codePointAt(0) || 0;
            // Rough wide-char detection: CJK / fullwidth / emoji blocks treated as width 2.
            if (
                (code >= 0x1100 && code <= 0x115F) ||
                (code >= 0x2E80 && code <= 0xA4CF) ||
                (code >= 0xAC00 && code <= 0xD7A3) ||
                (code >= 0xF900 && code <= 0xFAFF) ||
                (code >= 0xFE10 && code <= 0xFE6F) ||
                (code >= 0xFF00 && code <= 0xFF60) ||
                (code >= 0x1F300 && code <= 0x1FAFF)
            ) w += 2;
            else w += 1;
        }
        return w;
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
