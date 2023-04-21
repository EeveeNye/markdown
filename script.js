const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const titleInput = document.getElementById('title-input');
const insertImageBtn = document.getElementById('insert-image-btn');
const fileInput = document.createElement('input');
fileInput.type = 'file';
editor.addEventListener('input', () => {
    const markdown = editor.innerText;

    const html = marked(markdown);
    const title = titleInput.value;
    const titleHtml = title ? `<h1>${title}</h1>` : '';
    preview.innerHTML = `${titleHtml}${html}`;
    hljs.highlightAll();
});
titleInput.addEventListener('input', () => {
    const title = titleInput.value;
    const titleHtml = title ? `<h1>${title}</h1>` : '';
    const markdown = editor.innerHTML;

    const html = marked(markdown);
    preview.innerHTML = `${titleHtml}${html}`;
});

// 自动调整编辑器和预览窗口的高度，以适应不同屏幕尺寸
function adjustHeight() {
    const containerHeight = window.innerHeight - 112; // 减去标题栏和工具栏的高度
    editor.style.height = `${containerHeight}px`;
    preview.style.height = `${window.innerHeight}px`;
}
window.addEventListener('resize', adjustHeight);
adjustHeight();

// 插入本地图片
insertImageBtn.addEventListener('click', () => {
    fileInput.click();
});
fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
        const imageUrl = e.target.result;
        const imageHtml = `<img src="${imageUrl}" alt="">`;
        document.execCommand('insertHTML', false, imageHtml);
    };
    reader.readAsDataURL(file);
});

marked.setOptions({
    highlight: function (code) {
        return hljs.highlightAuto(code).value;
    },
    renderer: new marked.Renderer(),
    // 块级引用语法的计数器，用于决定是否需要在前面添加空行
    blockquoteCount: 0

});

// 处理#语法，控制标题大小
marked.Renderer.prototype.heading = function (text, level) {
    const size = 28 - level * 2;
    return `<h${level} style="font-size:${size}px">${text}</h${level}>`;
};

// 处理块级引用语法
marked.Renderer.prototype.blockquote = function (quote) {
    const count = marked.options.blockquoteCount;
    marked.options.blockquoteCount++;
    return `\n\n${count > 0 ? '\n' : ''}<blockquote>${quote.trim()}</blockquote>\n\n`;
};

function renderCodeBlock() {
    const codeBlocks = document.querySelectorAll('pre code');
    codeBlocks.forEach((block) => {
        hljs.highlightBlock(block);

        const lang = block.getAttribute('data-lang') || '';
        block.setAttribute('data-lang', lang);

        const codeTitle = document.createElement('div');
        codeTitle.className = 'code-title';
        codeTitle.textContent = lang;

        const copyButton = document.createElement('a');
        copyButton.className = 'copy-code-btn';
        copyButton.textContent = 'Copy';
        copyButton.href = 'javascript:void(0)';
        codeTitle.appendChild(copyButton);

        block.parentNode.insertBefore(codeTitle, block);

    });
}

// 在 editor 的 input 事件监听器中调用 renderCodeBlock 函数
editor.addEventListener('input', () => {
    const markdown = editor.innerText;
    const html = marked(markdown);
    const title = titleInput.value;
    const titleHtml = title ? `<h1>${title}</h1>` : '';
    preview.innerHTML = `${titleHtml}${html}`;
    renderCodeBlock();
});

// 在 titleInput 的 input 事件监听器中调用 renderCodeBlock 函数
titleInput.addEventListener('input', () => {
    const title = titleInput.value;
    const titleHtml = title ? `<h1>${title}</h1>` : '';
    const markdown = editor.innerText;
    const html = marked(markdown);
    preview.innerHTML = `${titleHtml}${html}`;
    renderCodeBlock();
});

document.addEventListener('click', (event) => {
    if (event.target.classList.contains('copy-code-btn')) {
        const copyButton = event.target;
        const code = copyButton.parentElement.nextElementSibling.innerText; // 修改这里
        const textarea = document.createElement('textarea');
        textarea.value = code;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        textarea.remove();

        copyButton.textContent = 'Copied!';
        setTimeout(() => {
            copyButton.textContent = 'Copy';
        }, 1500);
    }
});

// 恢复标题和内容
function restoreContent() {
    const savedTitle = localStorage.getItem('markdown-title');
    const savedContent = localStorage.getItem('markdown-content');

    if (savedTitle) {
        titleInput.value = savedTitle;
    }

    if (savedContent) {
        editor.innerText = savedContent;
    }

    // 触发一次 input 事件，以恢复预览区域
    editor.dispatchEvent(new Event('input'));
}

restoreContent();

// 保存标题和内容
function saveContent() {
    localStorage.setItem('markdown-title', titleInput.value);
    localStorage.setItem('markdown-content', editor.innerText);
}

// 在 input 事件中调用 saveContent 函数
editor.addEventListener('input', () => {
    saveContent();
});

titleInput.addEventListener('input', () => {
    saveContent();
});



// 添加 MutationObserver，监视 editor 元素的子节点变化
const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
        if (mutation.type === 'childList') {
            const addedNodes = Array.from(mutation.addedNodes);
            const codeBlocks = addedNodes.filter(node => node.tagName === 'CODE');
            codeBlocks.forEach((block) => {
                const lines = block.innerHTML.trim().split('\n').length;
                const lineNumbers = Array.from({ length: lines }, (_, i) => `<span class="line-number">${i + 1}</span>`).join('');
                const wrapper = document.createElement('div');
                wrapper.className = 'code-block';
                wrapper.innerHTML = `<div class="line-numbers">${lineNumbers}</div>${block.outerHTML}`;
                block.parentNode.replaceChild(wrapper, block);
            });
        }
    }
});

observer.observe(editor, { childList: true, subtree: true });

function syncScroll(from, to) {
    if (syncInProgress) {
        return;
    }
    syncInProgress = true;

    const fromRatio = from.scrollTop / (from.scrollHeight - from.clientHeight);
    const toScrollTop = fromRatio * (to.scrollHeight - to.clientHeight);

    if (Math.abs(to.scrollTop - toScrollTop) > 1) {
        to.scrollTop = toScrollTop;
    }
    syncInProgress = false;
}

let syncInProgress = false;

editor.addEventListener('scroll', () => {
    if (!syncInProgress) {
        requestAnimationFrame(() => {
            syncScroll(editor, preview);
        });
    }
});

preview.addEventListener('scroll', () => {
    if (!syncInProgress) {
        requestAnimationFrame(() => {
            syncScroll(preview, editor);
        });
    }
});

document.addEventListener('scroll', function (event) {
    const target = event.target;
    if (target.closest('#editor') || target.closest('#preview')) {
        event.preventDefault();
    }
}, true);

function setBold() {
    // 获取选中文本的范围
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    // 创建一个加粗的 span 元素
    const bold = document.createElement('span');
    bold.style.fontWeight = 'bold';
    // 将选中文本包裹在加粗的 span 元素中
    range.surroundContents(bold);
    // 清除选中文本的范围
    selection.removeAllRanges();
}

function showContextMenu(event) {
    // 阻止默认的右键菜单
    event.preventDefault();
    // 创建右键菜单
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.innerHTML = '<div onclick="setBold()">加粗</div>';
    // 将菜单添加到页面中
    document.body.appendChild(menu);
    // 设置菜单的位置
    menu.style.top = event.clientY + 'px';
    menu.style.left = event.clientX + 'px';
}
const contextMenu = document.getElementById('context-menu');
const boldMenuItem = document.getElementById('bold');
editor.addEventListener('contextmenu', (event) => {
    event.preventDefault();

    const selection = window.getSelection();
    const node = selection.focusNode;

    if (node.nodeType === Node.TEXT_NODE) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        contextMenu.style.display = 'block';
        contextMenu.style.left = `${rect.x}px`;
        contextMenu.style.top = `${rect.y}px`;
    }
});

boldMenuItem.addEventListener('click', () => {
    document.execCommand('bold', false, null);
    contextMenu.style.display = 'none';
});

// 加粗
document.getElementById('bold').addEventListener('click', () => {
    document.execCommand('bold', false, null);
    formatSelectedText('**', '**');
});

// 斜体
document.getElementById('italic').addEventListener('click', () => {
    document.execCommand('italic', false, null);
    formatSelectedText('_', '_');
});

// 下划线
document.getElementById('underline').addEventListener('click', () => {
    document.execCommand('underline', false, null);
    formatSelectedText('<u>', '</u>');
});

// // 删除线
// document.getElementById('strikethrough').addEventListener('click', () => {
//     document.execCommand('strikethrough', false, null);
//     formatSelectedText('~~', '~~');
// });

function formatSelectedText(leftSymbol, rightSymbol) {
    const editor = document.getElementById('editor');
    const selection = window.getSelection();
    const start = selection.anchorOffset;
    const end = selection.focusOffset;
    const text = editor.textContent.substring(start, end);
    const formattedText = `${leftSymbol}${text}${rightSymbol}`;
    document.execCommand('insertHTML', false, formattedText);
}
