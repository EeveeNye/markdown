import { Command, CommandManager } from './command.js';

const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const titleInput = document.getElementById('title-input');
const insertImageBtn = document.getElementById('insert-image-btn');
const fileInput = document.createElement('input');
fileInput.type = 'file';

var selection, range, selectedText;
let commandManager = new CommandManager();

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
    reRenderCodeBlock();
    // handleEditorInputChange();
    saveContent();
});

// 在 titleInput 的 input 事件监听器中调用 renderCodeBlock 函数
titleInput.addEventListener('input', () => {
    reRenderCodeBlock();
    saveContent();
});

document.addEventListener('click', (event) => {
    if (event.target.classList.contains('copy-code-btn')) {
        const copyButton = event.target;
        const code = copyButton.parentElement.nextElementSibling.innerText;
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
    // editorText = getEditorText();
}

restoreContent();

// 保存标题和内容
function saveContent() {
    localStorage.setItem('markdown-title', titleInput.value);
    localStorage.setItem('markdown-content', editor.innerText);
}


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
//同步滑动
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


const contextMenu = document.getElementById('context-menu');

editor.addEventListener('contextmenu', (event) => {
    event.preventDefault();

    contextMenu.style.display = 'block';
    contextMenu.style.left = `${event.pageX}px`;
    contextMenu.style.top = `${event.pageY}px`;
});

document.addEventListener('click', (event) => {
    if (event.target !== editor && event.target !== contextMenu) {
        contextMenu.style.display = 'none';
    }
});

// 代码段
document.getElementById('code').addEventListener('click', () => {
    formatSelectedText('\n```\n', '\n```\n');
});

// 加粗
document.getElementById('bold').addEventListener('click', () => {
    formatSelectedText('**', '**');
});

// 斜体
document.getElementById('italic').addEventListener('click', () => {
    formatSelectedText('_', '_');
});

// 下划线
document.getElementById('underline').addEventListener('click', () => {
    formatSelectedText('<u>', '</u>');
});

// 删除线
document.getElementById('strikethrough').addEventListener('click', () => {
    formatSelectedText('~~', '~~');
});

// 复制
document.getElementById('copy').addEventListener('click', () => {
    if (currentSelection && currentSelection.toString().length > 0) {
        let selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(currentSelection);
        document.execCommand('copy');
    }
});

// 剪切
document.getElementById('cut').addEventListener('click', () => {
    if (currentSelection && currentSelection.toString().length > 0) {
        let selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(currentSelection);
        document.execCommand('cut');
    }
});

//保存临时选取用于复制和剪切
let currentSelection = null;

editor.addEventListener("mouseup", function () {
    selection = window.getSelection();
    if (selection.toString().length > 0) {
        range = selection.getRangeAt(0);
        selectedText = range.toString();
        console.log(selectedText);
    }
    if (window.getSelection) {
        currentSelection = window.getSelection().getRangeAt(0).cloneRange();
    }
});

// //为文字添加头尾
// function formatSelectedText(leftSymbol, rightSymbol) {
//     if (selectedText.length > 0) {
//         const formattedText = `${leftSymbol}${selectedText}${rightSymbol}`;
//         var newNode = document.createTextNode(formattedText);
//         range.deleteContents();
//         range.insertNode(newNode);
//         range.setStart(newNode, 0);
//         range.setEnd(newNode, newNode.length);
//         selection.removeAllRanges();
//         selection.addRange(range);
//         // saveText();
//         reRenderCodeBlock();

//     }
//     contextMenu.style.display = "none";

// }

//重新渲染
function reRenderCodeBlock() {
    const markdown = editor.innerText;
    const html = marked(markdown);
    const title = titleInput.value;
    const titleHtml = title ? `<h1>${title}</h1>` : '';
    preview.innerHTML = `${titleHtml}${html}`;
    hljs.highlightAll();
    renderCodeBlock();

}

//点击空白关闭右键菜单
document.addEventListener("click", function (event) {
    if (event.target !== contextMenu && !contextMenu.contains(event.target)) {
        contextMenu.style.display = "none";
    }
});

// 在这里处理颜色（字体）按钮点击事件
document.querySelectorAll('.text-color-button').forEach((button) => {
    button.addEventListener('click', (event) => {
        const color = event.target.classList[1];
        if (color === 'black') {
            removeColorSpan();
        } else
            formatSelectedText(`<span style="color: ${color};">`, "</span>");
    });
});

// 在这里处理颜色（背景）按钮点击事件
document.querySelectorAll('.back-color-button').forEach((button) => {
    button.addEventListener('click', (event) => {
        const color = event.target.classList[1];

        if (color === 'white') {
            removeBackColorSpan();
        } else
            formatSelectedText(`<mark style="background-color: ${color};">`, "</mark>");
    });
});

// 点黑色字体按钮去除字体颜色
function removeColorSpan() {
    if (selectedText.length > 0) {
        const regex = /<span style="color: (.*?);">(.*?)<\/span>/g;
        const formattedText = selectedText.replace(regex, '$2');
        var newNode = document.createTextNode(formattedText);
        range.deleteContents();
        range.insertNode(newNode);
        range.setStart(newNode, 0);
        range.setEnd(newNode, newNode.length);
        selection.removeAllRanges();
        selection.addRange(range);

        reRenderCodeBlock();
    }
    contextMenu.style.display = "none";
}

// 点白色按钮去除背景
function removeBackColorSpan() {
    if (selectedText.length > 0) {
        const regex = /<mark style="background-color: (.*?);">(.*?)<\/mark>/g;
        const formattedText = selectedText.replace(regex, '$2');
        var newNode = document.createTextNode(formattedText);
        range.deleteContents();
        range.insertNode(newNode);
        range.setStart(newNode, 0);
        range.setEnd(newNode, newNode.length);
        selection.removeAllRanges();
        selection.addRange(range);
        reRenderCodeBlock();
    }
    contextMenu.style.display = "none";
}

// 添加事件监听器，当点击背景颜色为白色时，删除背景颜色
document.getElementById('back-color-white').addEventListener('click', () => {
    removeBackColorSpan();
});

// 注册撤销和重做命令
document.getElementById('undo').addEventListener('click', () => {
    commandManager.undo();
});

document.getElementById('redo').addEventListener('click', () => {
    commandManager.redo();
});

// 在编辑器内容发生变化时，记录命令
editor.addEventListener('input', () => {
    commandManager.executeCommand(editor.innerHTML);
});



// 添加链接功能
document.getElementById('link').addEventListener('click', () => {
    const url = prompt('请输入链接地址:');
    if (url) {
        formatSelectedText(`<a href="${url}" target="_blank">`, '</a>');
    }
});

// 添加有序列表功能
document.getElementById('ordered-list').addEventListener('click', () => {
    formatSelectedText('\n1. ', '\n');
});

// 添加无序列表功能
document.getElementById('unordered-list').addEventListener('click', () => {
    formatSelectedText('\n- ', '\n');
});

// 添加任务列表功能
document.getElementById('task-list').addEventListener('click', () => {
    formatSelectedText('\n- [ ] ', '\n');
});

// 添加表格功能
document.getElementById('table').addEventListener('click', () => {
    const tableTemplate = `\n| Header1 | Header2 |\n | ------- | ------- |\n | Cell1 | Cell2 |\n`;
    formatSelectedText(tableTemplate, '');
});

// 添加行内代码功能
document.getElementById('inline-code').addEventListener('click', () => {
    formatSelectedText('', '');
});

// 添加引用功能
document.getElementById('quote').addEventListener('click', () => {
    formatSelectedText('\n> ', '\n');
});

// 添加水平分割线功能
document.getElementById('horizontal-rule').addEventListener('click', () => {
    formatSelectedText('\n---\n', '');
});

// 添加自定义字体大小功能
document.querySelectorAll('.font-size-button').forEach((button) => {
    button.addEventListener('click', (event) => {
        const size = event.target.dataset.size;
        formatSelectedText(`<span style="font-size: ${size}px;">`, '</span>');
    });
});

// 初始化 Markdown 编辑器
reRenderCodeBlock();

// 撤销操作
document.getElementById('undo').addEventListener('click', () => {
    commandManager.undo();
    reRenderCodeBlock();
});

// 重做操作
document.getElementById('redo').addEventListener('click', () => {
    commandManager.redo();
    reRenderCodeBlock();
});

// 修改 formatSelectedText 函数以使用 CommandManager
function formatSelectedText(leftSymbol, rightSymbol) {
    if (selectedText.length > 0) {
        const formattedText = `${leftSymbol}${selectedText}${rightSymbol}`;
        const newNode = document.createTextNode(formattedText);
        const command = new Command(() => {
            range.deleteContents();
            range.insertNode(newNode);
            range.setStart(newNode, 0);
            range.setEnd(newNode, newNode.length);
            selection.removeAllRanges();
            selection.addRange(range);
            reRenderCodeBlock();
        }, () => {
            range.deleteContents();
            range.insertNode(document.createTextNode(selectedText));
            range.setStart(newNode, 0);
            range.setEnd(newNode, newNode.length);
            selection.removeAllRanges();
            selection.addRange(range);
            reRenderCodeBlock();
        });

        commandManager.executeCommand(command);
    }
    contextMenu.style.display = "none";
}    