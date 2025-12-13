// sidepanel.js (混合模式：Markdown + 嵌入式JSON错误检测)
document.addEventListener('DOMContentLoaded', () => {
    if (typeof marked === 'undefined') {
        document.body.innerHTML = "<p style='color:red;padding:20px;'>Error: marked.js not loaded.</p>";
        return;
    }

    const markdownInput = document.getElementById('markdown-input');
    const markdownOutput = document.getElementById('markdown-output');
    const wordCountEl = document.getElementById('word-count');
    const charCountNoSpaceEl = document.getElementById('char-count-no-space');
    const charCountWithSpaceEl = document.getElementById('char-count-with-space');
    const resizer = document.getElementById('resizer');
    const editorPane = document.querySelector('.editor-pane');
    const insertImageBtn = document.getElementById('insert-image-btn');
    const imageViewer = document.getElementById('image-viewer');
    const viewerImg = document.getElementById('viewer-img');
    const copyBtn = document.getElementById('copy-btn');

    markdownInput.addEventListener('input', () => {
        updateAll(markdownInput.value);
    });

    async function updateAll(text) {
        if (!text) {
            markdownOutput.innerHTML = '';
            updateCounts('');
            return;
        }

        const blockRegex = /([\s\S]*?<\/tool_call>)|(```json[\s\S]*?```)/gi;
        let lastIndex = 0;
        let match;
        let finalHtml = "";

        while ((match = blockRegex.exec(text)) !== null) {
            const markdownPart = text.substring(lastIndex, match.index);
            if (markdownPart) {
                finalHtml += await renderMarkdownPart(markdownPart);
            }

            const fullMatch = match[0];
            let jsonContent = "";
            let blockTitle = "JSON Block";

            if (fullMatch.startsWith('``')) {
                jsonContent = fullMatch.replace(/<\/?tool_call>/g, '').trim();
                blockTitle = "Tool Call (JSON)";
            } else {
                jsonContent = fullMatch.replace(/^```json|```$/gi, '').trim();
                blockTitle = "Code Block (JSON)";
            }

            finalHtml += processJsonBlock(jsonContent, blockTitle);
            lastIndex = blockRegex.lastIndex;
        }

        const remaining = text.substring(lastIndex);
        if (remaining) {
            finalHtml += await renderMarkdownPart(remaining);
        }

        markdownOutput.innerHTML = finalHtml;
        updateCounts(text);
    }

    async function renderMarkdownPart(text) {
        if (!text.trim()) return text;
        try {
            // 配置 marked 选项以支持表格和其他 GFM 功能
            const markedOptions = {
                gfm: true,
                breaks: true,
                tables: true
            };
            
            // 让marked.js完整处理所有Markdown语法，包括加粗等
            let html = await marked.parse(text, markedOptions);
            return html;
        } catch (e) {
            console.error('Markdown render error:', e);
            return `<p>Markdown Render Error: ${e.message}</p>`;
        }
    }

    function processJsonBlock(jsonString, title) {
        if (!jsonString) return '';
        try {
            const obj = JSON.parse(jsonString);
            const highlighted = syntaxHighlightJson(obj);
            return `
                <div class="mixed-json-block">
                    <div class="mixed-json-header">✅ ${title} - 格式正确</div>
                    <div class="mixed-json-content">${highlighted}</div>
                </div>
            `;
        } catch (e) {
            return renderJsonErrorWithContext(jsonString, e, title);
        }
    }

    function renderJsonErrorWithContext(text, error, title) {
        const errorMsg = error.message;
        let htmlContent = '';
        const match = errorMsg.match(/at position (\d+)/);
        if (match) {
            const pos = parseInt(match[1], 10);
            const before = escapeHtml(text.slice(0, pos));
            let char = text.charAt(pos);
            let displayChar = char;
            if (char === '\n') displayChar = '↵\n';
            else if (!char) displayChar = '&nbsp;';
            else displayChar = escapeHtml(char);
            const after = escapeHtml(text.slice(pos + 1));
            htmlContent = `${before}<span class="json-error-mark" title="${escapeHtml(errorMsg)}">${displayChar}</span>${after}`;
        } else {
            htmlContent = escapeHtml(text);
        }
        return `
            <div class="mixed-json-block" style="border-color: #D32F2F;">
                <div class="mixed-json-header" style="background-color: #FFEBEE; color: #D32F2F;">⚠️ ${title} - 格式错误</div>
                <div class="mixed-json-content">${htmlContent}</div>
                <div class="json-error-info">错误信息: ${escapeHtml(errorMsg)}</div>
            </div>
        `;
    }

    function escapeHtml(text) {
        return (text || '').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    function syntaxHighlightJson(json) {
        if (typeof json !== 'string') json = JSON.stringify(json, null, 2);
        json = escapeHtml(json);
        return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
            let cls = 'j-num';
            if (/^"/.test(match)) {
                if (/:$/.test(match)) cls = 'j-key';
                else cls = 'j-str';
            } else if (/true|false/.test(match)) cls = 'j-bool';
            else if (/null/.test(match)) cls = 'j-null';
            return '<span class="' + cls + '">' + match + '</span>';
        });
    }

    function updateCounts(text) {
        const noSpace = text.replace(/\s/g, '').length;
        const zh = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
        const en = (text.match(/[a-zA-Z_']+/g) || []).length;
        wordCountEl.textContent = zh + en;
        charCountNoSpaceEl.textContent = noSpace;
        charCountWithSpaceEl.textContent = text.length;
    }

    copyBtn.addEventListener('click', () => {
        const val = markdownInput.value;
        if (!val) return;
        navigator.clipboard.writeText(val).then(() => {
            const orig = copyBtn.textContent;
            copyBtn.textContent = 'Success!';
            copyBtn.classList.add('copied');
            setTimeout(() => { copyBtn.textContent = orig; copyBtn.classList.remove('copied'); }, 2000);
        });
    });

    insertImageBtn.addEventListener('click', () => {
        const ta = markdownInput;
        let val = ta.value;
        const urls = new Set();
        let m;
        const mdRe = /!\[.*?\]\((.*?)\)/g;
        while ((m = mdRe.exec(val)) !== null) urls.add(m[1].trim());
        const urlRe = /https?:\/\/[^\s"'()\[\]\{\}]+/g;
        const matches = [];
        while ((m = urlRe.exec(val)) !== null) {
            if (!urls.has(m[0])) matches.push({u: m[0], i: m.index});
        }
        if (matches.length === 0) { alert("No new image URLs found."); return; }
        for (let i = matches.length - 1; i >= 0; i--) {
            const item = matches[i];
            val = val.substring(0, item.i) + `![](${item.u})` + val.substring(item.i + item.u.length);
        }
        const c = ta.selectionStart;
        ta.value = val;
        ta.selectionStart = ta.selectionEnd = c;
        ta.dispatchEvent(new Event('input'));
    });

    let isResizing = false;
    resizer.addEventListener('mousedown', () => { isResizing = true; document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none'; document.addEventListener('mousemove', mm); document.addEventListener('mouseup', mu); });
    function mm(e) { if(!isResizing)return; const w = e.clientX - editorPane.getBoundingClientRect().left; const tw = editorPane.parentElement.offsetWidth; if(w>50 && tw-w>50) { const p = w/tw*100; editorPane.style.width = `${p}%`; document.querySelector('.preview-pane').style.width = `${100-p}%`; } }
    function mu() { isResizing = false; document.body.style.cursor = 'default'; document.body.style.userSelect = 'auto'; document.removeEventListener('mousemove', mm); document.removeEventListener('mouseup', mu); }
    let sc = 1, tx = 0, ty = 0, drag = false, sx, sy;
    markdownOutput.addEventListener('click', (e) => { if(e.target.tagName==='IMG'){ viewerImg.src=e.target.src; imageViewer.classList.add('visible'); document.body.classList.add('viewer-active'); sc=1;tx=0;ty=0; updT(); } });
    imageViewer.addEventListener('click', (e)=>{ if(e.target===imageViewer){ imageViewer.classList.remove('visible'); document.body.classList.remove('viewer-active'); }});
    function updT(){ viewerImg.style.transform=`translate(${tx}px, ${ty}px) scale(${sc})`; }
    viewerImg.addEventListener('wheel', (e)=>{ e.preventDefault(); if(e.deltaY<0)sc*=1.1;else sc/=1.1; sc=Math.max(0.1,Math.min(sc,10)); updT(); });
    viewerImg.addEventListener('mousedown', (e)=>{ drag=true; sx=e.clientX-tx; sy=e.clientY-ty; });
    window.addEventListener('mousemove', (e)=>{ if(drag){ tx=e.clientX-sx; ty=e.clientY-sy; updT(); } });
  window.addEventListener('mouseup', ()=>{ drag=false; });

  function setThemeClass(cls) {
    const prev = Array.from(document.body.classList).find(c => c.startsWith('theme-'));
    if (prev) document.body.classList.remove(prev);
    if (cls) document.body.classList.add(cls);
  }
  window.addEventListener('message', (e) => {
    const d = e.data || {};
    if (d.type === 'set-theme' && typeof d.theme === 'string') setThemeClass(d.theme);
  });
  updateAll(markdownInput.value);
});
