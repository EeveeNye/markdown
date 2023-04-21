const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const titleInput = document.getElementById('title-input');
const insertImageBtn = document.getElementById('insert-image-btn');
const fileInput = document.createElement('input');
fileInput.type = 'file';

var selection, range, selectedText;
const dmp = new diff_match_patch();
let editorText = ''; // 当前编辑器中的文本
let changeHistory = []; // 保存文本更改的历史记录
let currentPosition = -1; // 当前的历史记录位置

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
    editorText = getEditorText();
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

//为文字添加头尾
function formatSelectedText(leftSymbol, rightSymbol) {
    if (selectedText.length > 0) {
        const formattedText = `${leftSymbol}${selectedText}${rightSymbol}`;
        var newNode = document.createTextNode(formattedText);
        range.deleteContents();
        range.insertNode(newNode);
        range.setStart(newNode, 0);
        range.setEnd(newNode, newNode.length);
        selection.removeAllRanges();
        selection.addRange(range);

        reRenderCodeBlock();
        saveText();
    }
    contextMenu.style.display = "none";

}

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
            removeColorSpan();
        } else
            formatSelectedText(`<mark style="background-color: ${color};">`, "</mark>");
    });
});

//点黑色字体按钮去除字体颜色
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

//点白色按钮去除背景
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


//#region 撤回功能



function getEditorText() {
    return editor.textContent;
}


function saveText() {

    // 计算新的文本和旧的文本之间的差异
    let diffs = dmp.diff_main(editorText, getEditorText());
    dmp.diff_cleanupEfficiency(diffs);
    console.log('oldText:', editorText);
    console.log('newText:', getEditorText());
    // 将差异保存到历史记录中
    if (diffs.length > 1) {
        changeHistory.push(JSON.stringify(diffs));
        currentPosition++;
    }
}
function undo() {
    if (currentPosition >= 0) {
        let changesToUndo = changeHistory[currentPosition];
        if (typeof changesToUndo === 'string') {
            let diffs = JSON.parse(changesToUndo);
            let reversedChanges = dmp.diff_main(diffs, []);

            dmp.diff_cleanupEfficiency(reversedChanges);
            let reversedText = dmp.patch_apply(dmp.patch_make(reversedChanges), editorText)[0];
            setEditorText(reversedText);

            currentPosition--;
        } else {
            console.error('Invalid history entry:', changesToUndo);
        }
    }
}

function redo() {
    if (currentPosition < changeHistory.length - 1) {
        currentPosition++;
        let changesToRedo = changeHistory[currentPosition];

        if (typeof changesToRedo === 'string') {
            let diffs = JSON.parse(changesToRedo);
            let newText = dmp.patch_apply(dmp.patch_make(diffs), editorText)[0];
            setEditorText(newText);
        } else {
            console.error('Invalid history entry:', changesToRedo);
        }
    }
}
document.addEventListener('keydown', function (event) {
    if (event.ctrlKey || event.metaKey) {
        if (event.key === 'z') {
            event.preventDefault();
            undo();
        } else if (event.key === 'y' || event.key === 'Z') {
            event.preventDefault();
            redo();
        }
    }
});

//#endregion