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
        const html = renderJsonValue(data, 0);
        outputEl.innerHTML = `<div class="json-container">${html}</div>`;
    }

    // 通用JSON值渲染函数
    function renderJsonValue(value, depth = 0) {
        const indent = '  '.repeat(depth);
        
        if (value === null) {
            return `<span class="json-null">null</span>`;
        }
        
        if (value === undefined) {
            return `<span class="json-undefined">undefined</span>`;
        }
        
        switch (typeof value) {
            case 'string':
                return `<span class="json-string">"${escapeHtml(value)}"</span>`;
            case 'number':
                return `<span class="json-number">${value}</span>`;
            case 'boolean':
                return `<span class="json-boolean">${value}</span>`;
            case 'object':
                if (Array.isArray(value)) {
                    return renderJsonArray(value, depth);
                } else {
                    return renderJsonObject(value, depth);
                }
            default:
                return `<span class="json-default">${escapeHtml(String(value))}</span>`;
        }
    }

    function renderJsonObject(obj, depth = 0) {
        const indent = '  '.repeat(depth);
        const keys = Object.keys(obj);
        
        if (keys.length === 0) {
            return '{}';
        }
        
        const items = keys.map(key => {
            const value = obj[key];
            const valueHtml = renderJsonValue(value, depth + 1);
            return `${indent}  <span class="json-key">"${escapeHtml(key)}"</span>: ${valueHtml}`;
        });
        
        return `{
${items.join(',\n')}
${indent}}`;
    }
    
    function renderJsonArray(arr, depth = 0) {
        const indent = '  '.repeat(depth);
        
        if (arr.length === 0) {
            return '[]';
        }
        
        const items = arr.map(item => {
            const valueHtml = renderJsonValue(item, depth + 1);
            return `${indent}  ${valueHtml}`;
        });
        
        return `[
${items.join(',\n')}
${indent}]`;
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
