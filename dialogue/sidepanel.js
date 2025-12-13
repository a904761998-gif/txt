document.addEventListener('DOMContentLoaded', () => {
    // 调试信息：检查marked.js是否正确加载
    console.log('Checking marked.js availability:', typeof marked !== 'undefined' ? marked : 'Not loaded');
    
    const jsonInput = document.getElementById('jsonInput');
    const renderBtn = document.getElementById('renderBtn');
    const clearBtn = document.getElementById('clearBtn');
    const copyBtn = document.getElementById('copyBtn');
    const dialogueContainer = document.getElementById('dialogue');
    const resizer = document.getElementById('resizer');
    const leftPane = document.querySelector('.left');

    // 渲染对话功能
    renderBtn.addEventListener('click', () => {
        renderDialogue();
    });

    // 清空功能
    clearBtn.addEventListener('click', () => {
        jsonInput.value = '';
        dialogueContainer.innerHTML = '';
        jsonInput.focus();
    });

    // 复制结果功能
    copyBtn.addEventListener('click', () => {
        const result = jsonInput.value;
        if (!result) {
            showStatus('没有内容可复制', 'error');
            return;
        }

        navigator.clipboard.writeText(result).then(() => {
            showStatus('复制成功!', 'success');
        }).catch(err => {
            showStatus('复制失败: ' + err, 'error');
        });
    });

    // 初始化时尝试渲染已有的内容
    if (jsonInput.value.trim()) {
        renderDialogue();
    }

    function renderDialogue() {
        dialogueContainer.innerHTML = ''; // 清空上一次结果
        let jsonText = jsonInput.value.trim();

        if (!jsonText) {
            showStatus('请粘贴 JSON 数据', 'error');
            return;
        }

        let data;
        try {
            data = JSON.parse(jsonText);
        } catch (e) {
            showStatus('JSON 格式不正确: ' + e.message, 'error');
            return;
        }

        if (!Array.isArray(data)) {
            showStatus('JSON 数据必须是数组格式', 'error');
            return;
        }

        data.forEach(item => {
            let msgDiv = document.createElement('div');
            msgDiv.classList.add('message');
            msgDiv.classList.add(item.role === 'prompt' ? 'user' : 'assistant');

            let bubble = document.createElement('div');
            bubble.classList.add('bubble');

            // 角色标签
            let role = document.createElement('div');
            role.classList.add('role-label');
            role.textContent = item.role === 'prompt' ? '用户' : '助理';
            bubble.appendChild(role);

            // 文本
            if (item.text) {
                let textElem = document.createElement('div');
                // 使用marked.js渲染Markdown
                try {
                    // 确保marked已正确加载
                    if (typeof marked !== 'undefined') {
                        // 使用marked的现代API
                        if (marked.parse) {
                            textElem.innerHTML = marked.parse(item.text);
                        } else if (marked.marked) {
                            // 兼容旧版本
                            textElem.innerHTML = marked.marked(item.text);
                        } else {
                            // 回退到普通文本处理
                            textElem.innerHTML = item.text.replace(/\n/g, '<br>');
                        }
                    } else {
                        // 如果marked未加载，回退到普通文本处理
                        textElem.innerHTML = item.text.replace(/\n/g, '<br>');
                    }
                } catch (e) {
                    console.error('Markdown parsing error:', e);
                    // 如果Markdown解析失败，回退到普通文本处理
                    textElem.innerHTML = item.text.replace(/\n/g, '<br>');
                }
                bubble.appendChild(textElem);
            }

            // 图片
            if (item.image_url) {
                let imgContainer = document.createElement('div');
                imgContainer.classList.add('image-container');
                let img = document.createElement('img');
                img.src = item.image_url;
                img.alt = "图片";
                img.onerror = function() {
                    this.alt = "图片加载失败";
                };
                imgContainer.appendChild(img);
                bubble.appendChild(imgContainer);
            }

            msgDiv.appendChild(bubble);
            dialogueContainer.appendChild(msgDiv);
        });

        showStatus('渲染成功!', 'success');
    }

    function showStatus(message, type) {
        // 移除之前的状态消息
        const existingStatus = document.querySelector('.status-message');
        if (existingStatus) {
            existingStatus.remove();
        }

        const status = document.createElement('div');
        status.className = `status-message ${type}`;
        status.textContent = message;
        status.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            font-weight: 500;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            backdrop-filter: blur(10px);
            animation: fadeInOut 3s forwards;
        `;

        if (type === 'success') {
            status.style.background = 'rgba(76, 175, 80, 0.9)';
            status.style.color = 'white';
            status.style.border = '1px solid rgba(76, 175, 80, 0.5)';
        } else {
            status.style.background = 'rgba(244, 67, 54, 0.9)';
            status.style.color = 'white';
            status.style.border = '1px solid rgba(244, 67, 54, 0.5)';
        }

        document.body.appendChild(status);

        // 3秒后自动移除
        setTimeout(() => {
            if (status.parentNode) {
                status.parentNode.removeChild(status);
            }
        }, 3000);
    }

    // 添加淡入淡出动画样式
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeInOut {
            0% { opacity: 0; transform: translateY(-20px); }
            10% { opacity: 1; transform: translateY(0); }
            90% { opacity: 1; transform: translateY(0); }
            100% { opacity: 0; transform: translateY(-20px); }
        }
    `;
    document.head.appendChild(style);

    // 拖拽调整大小功能
    let isResizing = false;

    resizer.addEventListener('mousedown', (e) => {
        isResizing = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', stopResizing);
        e.preventDefault();
    });

    function handleMouseMove(e) {
        if (!isResizing) return;
        
        const container = document.querySelector('.container');
        const containerRect = container.getBoundingClientRect();
        const x = e.clientX - containerRect.left;
        const percentage = (x / containerRect.width) * 100;
        
        // 限制最小宽度
        if (percentage > 10 && percentage < 90) {
            leftPane.style.width = `${percentage}%`;
            document.querySelector('.right').style.width = `${100 - percentage}%`;
        }
    }

    function stopResizing() {
        isResizing = false;
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', stopResizing);
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
