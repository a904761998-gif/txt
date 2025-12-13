document.addEventListener('DOMContentLoaded', () => {
  const leftDiv = document.getElementById('left-text');
  const rightDiv = document.getElementById('right-text');
  const copyLeftBtn = document.getElementById('copy-left-btn');
  const copyRightBtn = document.getElementById('copy-right-btn');
  const notificationBox = document.getElementById('notification-box');
  const searchStatusDiv = document.getElementById('search-status');
  const searchPanel = document.getElementById('search-panel');
  const searchPosition = document.getElementById('search-position');
  const searchTotal = document.getElementById('search-total');
  const prevMatchBtn = document.getElementById('prev-match');
  const nextMatchBtn = document.getElementById('next-match');
  const closeSearchBtn = document.getElementById('close-search');
  
  let isNotifying = false;
  let currentMatches = [];
  let currentMatchIndex = -1;

  function getTextFromDiv(divElement) {
    if (!divElement.innerText || divElement.innerText === '\n') {
      return '';
    }
    return divElement.innerText;
  }

  function debounce(func, delay) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), delay);
    };
  }

  function renderPanes(text1, text2) {
    if (CSS.highlights) {
      CSS.highlights.clear();
    }
    searchStatusDiv.textContent = '';

    if (typeof Diff === 'undefined') {
      console.error('Diff 库未加载');
      leftDiv.innerText = text1;
      rightDiv.innerText = text2;
      return false;
    }

    const diff = Diff.diffChars(text1, text2);
    const leftFragment = document.createDocumentFragment();
    const rightFragment = document.createDocumentFragment();
    let hasChanges = false;

    diff.forEach((part) => {
      if (part.added || part.removed) { hasChanges = true; }
      const node = document.createTextNode(part.value);
      if (part.added) {
        const span = document.createElement('span');
        span.className = 'highlight-added';
        span.appendChild(node);
        rightFragment.appendChild(span);
      } else if (part.removed) {
        const span = document.createElement('span');
        span.className = 'highlight-removed';
        span.appendChild(node);
        leftFragment.appendChild(span);
      } else {
        leftFragment.appendChild(node.cloneNode(true));
        rightFragment.appendChild(node.cloneNode(true));
      }
    });

    leftDiv.innerHTML = '';
    rightDiv.innerHTML = '';
    leftDiv.appendChild(leftFragment);
    rightDiv.appendChild(rightFragment);
    return hasChanges;
  }

  function compareAndHighlight() {
    const text1 = getTextFromDiv(leftDiv);
    const text2 = getTextFromDiv(rightDiv);
    if (text1 === text2 && text1.trim() !== '') {
      if (!isNotifying) {
        isNotifying = true;
        notificationBox.classList.add('show');
        setTimeout(() => {
          notificationBox.classList.remove('show');
          setTimeout(() => { isNotifying = false; }, 500);
        }, 1500);
      }
      leftDiv.innerText = text1;
      rightDiv.innerText = text2;
      if (CSS.highlights) CSS.highlights.clear();
      searchStatusDiv.textContent = '';
      return;
    }
    renderPanes(text1, text2);
  }

  const debouncedCompare = debounce(compareAndHighlight, 300);
  leftDiv.addEventListener('input', debouncedCompare);
  rightDiv.addEventListener('input', debouncedCompare);

  function highlightMatches(textToMatch, targetDiv) {
    if (!CSS.highlights) return;
    CSS.highlights.clear();
    if (!textToMatch || textToMatch.length < 1) {
      searchStatusDiv.textContent = '';
      searchPanel.classList.remove('visible');
      return;
    }
    const ranges = [];
    const treeWalker = document.createTreeWalker(targetDiv, NodeFilter.SHOW_TEXT);
    let currentNode = treeWalker.nextNode();
    while (currentNode) {
      const nodeValue = currentNode.nodeValue;
      let startPos = 0;
      let index;
      while ((index = nodeValue.indexOf(textToMatch, startPos)) > -1) {
        const range = document.createRange();
        range.setStart(currentNode, index);
        range.setEnd(currentNode, index + textToMatch.length);
        ranges.push(range);
        startPos = index + 1;
      }
      currentNode = treeWalker.nextNode();
    }
    if (ranges.length > 0) {
      // 保存匹配结果
      currentMatches = ranges;
      
      // 只有在初始状态下才设置索引为0
      if (currentMatchIndex === -1) {
        currentMatchIndex = 0;
      }
      
      // 显示搜索面板
      searchPanel.classList.add('visible');
      searchTotal.textContent = ranges.length;
      searchPosition.textContent = currentMatchIndex + 1;
      
      // 高亮所有匹配项
      const highlight = new Highlight(...ranges);
      CSS.highlights.set("search-results", highlight);
      
      // 高亮当前匹配项
      if (ranges.length > 0) {
        const currentHighlight = new Highlight(ranges[currentMatchIndex]);
        CSS.highlights.set("current-match", currentHighlight);
        
        // 滚动到当前匹配项
        scrollToMatch(ranges[currentMatchIndex], targetDiv);
      }
      
      searchStatusDiv.textContent = `查询到相同文本：${ranges.length}处`;
    } else {
      searchStatusDiv.textContent = `未查询到相同文本 (0)`;
      searchPanel.classList.remove('visible');
    }
  }

  function scrollToMatch(range, container) {
    const rect = range.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const offset = rect.top - containerRect.top + container.scrollTop;
    const top = Math.max(0, offset - 50);
    // 使用requestAnimationFrame确保滚动完成后才可能触发其他事件
    requestAnimationFrame(() => {
      container.scrollTo({ top, behavior: 'smooth' });
    });
  }
  
  function goToNextMatch(direction, targetDiv) {
    if (currentMatches.length === 0) return;
    
    // 清除当前高亮
    if (CSS.highlights.has("current-match")) {
      CSS.highlights.delete("current-match");
    }
    
    // 更新索引
    if (direction === 'next') {
      currentMatchIndex = (currentMatchIndex + 1) % currentMatches.length;
    } else {
      currentMatchIndex = (currentMatchIndex - 1 + currentMatches.length) % currentMatches.length;
    }
    
    // 更新显示
    searchPosition.textContent = currentMatchIndex + 1;
    
    // 高亮新的当前匹配项
    const currentRange = currentMatches[currentMatchIndex];
    const currentHighlight = new Highlight(currentRange);
    CSS.highlights.set("current-match", currentHighlight);
    
    // 滚动到当前匹配项
    scrollToMatch(currentRange, targetDiv);
  }
  
  function handleSelection() {
    const selection = window.getSelection();
    const selectedText = selection.toString();
    if (!selectedText) {
      if (CSS.highlights) CSS.highlights.clear();
      searchStatusDiv.textContent = '';
      searchPanel.classList.remove('visible');
      currentMatches = [];
      currentMatchIndex = -1;
      return;
    }
    const anchorNode = selection.anchorNode;
    const parentElement = anchorNode.nodeType === 3 ? anchorNode.parentElement : anchorNode;
    let container = parentElement;
    while(container && container !== leftDiv && container !== rightDiv && container !== document.body) {
        container = container.parentElement;
    }
    if (container === leftDiv) {
      highlightMatches(selectedText, rightDiv);
    } else if (container === rightDiv) {
      highlightMatches(selectedText, leftDiv);
    }
  }

  // 监听文本选择
  const debouncedSelection = debounce(handleSelection, 200);
  document.addEventListener('mouseup', debouncedSelection);
  document.addEventListener('keyup', (e) => {
    if (e.key === 'Shift' || e.key.startsWith('Arrow')) {
      debouncedSelection();
    }
  });

  function setThemeClass(cls) {
    const prev = Array.from(document.body.classList).find(c => c.startsWith('theme-'));
    if (prev) document.body.classList.remove(prev);
    if (cls) document.body.classList.add(cls);
  }
  window.addEventListener('message', (e) => {
    const d = e.data || {};
    if (d.type === 'set-theme' && typeof d.theme === 'string') setThemeClass(d.theme);
  });
  
  
  // 监听搜索面板按钮
  nextMatchBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // 阻止事件冒泡
    // 简化容器判断逻辑，基于当前已有的匹配项
    if (currentMatches.length > 0) {
      // 查找当前匹配项所在的容器
      const currentRange = currentMatches[currentMatchIndex];
      const container = currentRange.startContainer.parentElement.closest('#left-text, #right-text') || rightDiv;
      goToNextMatch('next', container);
    } else {
      // 默认使用右侧面板
      goToNextMatch('next', rightDiv);
    }
  });
  
  prevMatchBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // 阻止事件冒泡
    // 简化容器判断逻辑，基于当前已有的匹配项
    if (currentMatches.length > 0) {
      // 查找当前匹配项所在的容器
      const currentRange = currentMatches[currentMatchIndex];
      const container = currentRange.startContainer.parentElement.closest('#left-text, #right-text') || rightDiv;
      goToNextMatch('prev', container);
    } else {
      // 默认使用右侧面板
      goToNextMatch('prev', rightDiv);
    }
  });
  
  closeSearchBtn.addEventListener('click', () => {
    searchPanel.classList.remove('visible');
    currentMatches = [];
    currentMatchIndex = -1;
    if (CSS.highlights.has("search-results")) {
      CSS.highlights.delete("search-results");
    }
    if (CSS.highlights.has("current-match")) {
      CSS.highlights.delete("current-match");
    }
    searchStatusDiv.textContent = '';
    window.getSelection().removeAllRanges();
  });

  function setupCopyButton(button, sourceDiv) {
    button.addEventListener('click', () => {
      const textToCopy = getTextFromDiv(sourceDiv);
      navigator.clipboard.writeText(textToCopy).then(() => {
        const originalText = button.textContent;
        button.textContent = '已复制!';
        button.classList.add('copied');
        setTimeout(() => {
          button.textContent = originalText;
          button.classList.remove('copied');
        }, 1500);
      }).catch(err => {
        console.error('复制失败: ', err);
      });
    });
  }
  setupCopyButton(copyLeftBtn, leftDiv);
  setupCopyButton(copyRightBtn, rightDiv);
  leftDiv.innerText = "Header Section\n\nThis is a natural paragraph.\nIt has multiple lines.\n\nHere is another paragraph after a blank line.";
  rightDiv.innerText = "Header Section\n\nThis is a modified paragraph.\nIt has multiple lines.\n\nHere is another paragraph after a blank line.";
  compareAndHighlight();
});
