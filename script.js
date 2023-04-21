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
    renderer: new marked.Renderer()

});

// 处理#语法，控制标题大小
marked.Renderer.prototype.heading = function (text, level) {
    const size = 28 - level * 2;
    return `<h${level} style="font-size:${size}px">${text}</h${level}>`;
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
