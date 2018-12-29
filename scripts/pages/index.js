const { ipcRenderer, dialog } = require('electron');
const fs = require('fs');

// tools
let ClassList = {
    add(el, ...classNames) {
        el.classList.add(...classNames);
    },
    remove(el, ...classNames) {
        el.classList.remove(...classNames);
    },
    has(el, className) {
        return el.classList.contains(className);
    }
};
class Element {
    createElement(nodes, rootNode) {
        let root = rootNode ? this.parseNode(rootNode) : document.createElement("div");
        this.root = root;
        ClassList.add(root, "root");
        return this.createTree(root, nodes);
    }
    createTree(parent, nodes) {
        let root = this.root;
        for(let i = 0; i < nodes.length; i++){
            let curNode = nodes[i];
            let el = this.parseNode(curNode, root, parent);
            // 添加子树
            if(curNode.children){
                let childTree = this.createTree(el, curNode.children); 
                parent.appendChild(childTree);
            }else{
                parent.appendChild(el);
            }
        }

        return parent;
    }
    parseNode(curNode, root, parent) {
        // 创建dom
        let el = document.createElement(curNode.kind || "div");
        // 如果是input
        if(curNode.kind === "input"){
            el.type = curNode.type || "text";
        }
        // 添加id
        if(curNode.attrs){
            let attrs = curNode.attrs;
            for(let key in attrs){
                el[key] = attrs[key];
            }
        }   
        // 添加classNames
        if(curNode.classNames){
            ClassList.add(el, ...curNode.classNames);
        }
        // 添加innerText
        if(curNode.text){
            el.innerText = curNode.text;
        }
        // 添加innerHTML
        if(curNode.html){
            el.innerHTML = curNode.html;
        }
        // 添加dataset
        if(curNode.datasets){
            let datasets = curNode.dataset;
            for(let key in datasets){
                el.dataset[key] = datasets[key];
            }
        }
        // 立即执行事件
        if(curNode.fun){
            curNode.fun(el);
        }
        // 添加事件
        if(curNode.events){
            let events = curNode.events;
            for(let key in events){
                el.addEventListener(key, events[key](root, parent, el), false);
            }
        }
        return el;
    }
    static getChildren(parent, selector) {
        let els = parent.querySelectorAll(selector);
        let children = [];
        for(let i = 0; i < els.length; i++){
            let el = els[i];
            if(el.parentNode === parent){
                children.push(el);
            }
        }
        return children;
    }
};

// sys
let Sys = {
    contextMenu: undefined,
    initEvent() {
        document.addEventListener("click", () => {
            let contextMenu = document.querySelectorAll('.context-menu');
            contextMenu.forEach((item) => {
                item.remove();
            });
        });
        let fileParser = new FileParser();
        let directory = new Directory();
        ipcRenderer.on('openDirectory-message', (event, paths) => {
            let nodes = [];
            let nodesPromise = fileParser.parseToNodes(paths, nodes);
            nodesPromise.then(() => {
                directory.init(nodes);
            })
        });
        ipcRenderer.on("openFile-message", (event, paths) => {
            let nodes = [];
            console.log(paths)
            let nodesPromise = fileParser.parseToNodes(paths, nodes);
            nodesPromise.then(() => {
                directory.init(nodes);
            })
        });
    }
};

// panel
class Panel {
    constructor(panel) {
        this.panel = panel;
        panel.panel = this; // 将panel对象保存到dom
        this.dropBtn = panel.querySelector(".drop-btn");
        this.closeBtn = panel.querySelector(".close-btn");
        this.content = panel.querySelector(".panel-content");
    }
    // 获取页面所有panel
    static getPanels() {
        return document.querySelectorAll(".panel");
    }
    // 初始化所有panel
    static initPanels() {
        const panels = Panel.getPanels();
        for(let i = 0; i < panels.length; i++){
            const panel = new Panel(panels[i]);
            panel.initEvent();
            panel.refreshContentHeight();
        }
    }
    // 初始化panel的事件
    initEvent() {
        let dropBtn = this.dropBtn;
        let closeBtn = this.closeBtn;
        let content = this.content;

        this.state = 0;
        this.stateArr = ["&#xe62c;", "&#xe62e;"];
        this.heightArr = [content.clientHeight, "0"];

        dropBtn.addEventListener("click", () => {
            let state = this.state;
            this.state = state = (state + 1) % 2;
            dropBtn.innerHTML = this.stateArr[state];
            content.style.height = this.heightArr[state] + 'px';
        }, false);

        closeBtn.addEventListener("click", () => {
            this.panel.style.display = "none";
        });
    }
    // 设置content高度
    refreshContentHeight() {
        this.content.style.height = "auto";
        let clientHeight = this.content.clientHeight;
        let maxHeight = document.body.clientHeight - this.content.offsetTop;
        let scrollTop = this.content.scrollTop;
        if(clientHeight < maxHeight) {
            this.content.style.height = clientHeight + 'px';
            this.heightArr[0] = clientHeight;
        }else if(clientHeight > maxHeight) {
            this.content.style.height = maxHeight + 'px';
            this.heightArr[0] = maxHeight;
        }
        this.content.scrollTop = scrollTop;
    }
}

// tab
class Tab{

    // initEvent
    initEvent() {
        let btns = document.querySelectorAll(".tab-btn");
        let items = document.querySelectorAll(".tab-content-item");
        for(let i = 0; i < btns.length; i++){
            let curBtn = btns[i];
            let curItem = items[i];
            this.addEvent(curBtn, curItem);
        }
    }

    // addEvent
    addEvent(btn, item) {
        btn.addEventListener("click", () => {
            let preActiveBtn = document.querySelector(".tab-btn.active");
            let preActiveItem = document.querySelector(".tab-content-item.active");
            if(preActiveBtn === btn){
                return;
            }
            this.toggleTab(preActiveBtn, preActiveItem, btn, item);
        }, false);
    }

    // toggleActive
    toggleTab(preBtn, preItem, curBtn, curItem) {
        ClassList.remove(preBtn, "active");
        ClassList.remove(preItem, "active");
        ClassList.add(curBtn, "active");
        ClassList.add(curItem, "active");
    }   
}

// popup
class Popup {
    createTmp(contentNodes, callback) {
        let nodes = [
            {
                classNames: ["popup-wrap"],
                events: {
                    click: this.focus,
                },
                children: [
                    {
                        classNames: ["popup"],
                        events: {
                            click: () => {
                                return (e) => {
                                    e.stopPropagation();
                                }
                            }
                        },
                        children: [
                            {
                                classNames: ["popup-bar"],
                                children: [
                                    {
                                        classNames: ["close-btn", "btn", "iconfont"],
                                        html: "&#xe624;",
                                        events: {
                                            click: this.cancel
                                        }
                                    }
                                ]
                            },
                            {
                                classNames: ["popup-content"],
                                children: contentNodes
                            },
                            {
                                classNames: ["popup-btn-wrap", "btn-group"],
                                children: [
                                    {
                                        classNames: ["yes-btn", "btn", "btn-green"],
                                        kind: "button",
                                        events: {
                                            click: this.yes(callback)
                                        },
                                        text: "确定"
                                    },
                                    {
                                        classNames: ["no-btn", "btn", "btn-red"],
                                        kind: "button",
                                        events: {
                                            click: this.cancel
                                        },
                                        text: "取消"
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        ];
        return (new Element()).createElement(nodes);
    }
    focus(root, parent, el) {
        let popup;
        return () => {
            popup = popup || el.querySelector(".popup");
            popup.style.animation = "popup-focus 300ms linear 0s 3 normal";
            popup.style.border = "2px solid red";
            setTimeout(() => {
                popup.style.animation = null;
                popup.style.border = null;
            }, 900);
        }
    }
    cancel(root, parent, el) {
        return (e) => {
            e.stopPropagation();
            document.body.removeChild(root);
        } 
    }
    yes(callback) {
        return (root, parent, el) => {
            return (e) => {
                e.stopPropagation();
                callback(root, parent, el);
                e.stopPropagation();
                document.body.removeChild(root);
            }
        }
    }
    createPopup(nodes, callback) {
        const root = this.createTmp(nodes, callback);
        document.body.appendChild(root);
    }
}

// fileParser
class FileParser {
    constructor(args = {}) {
        this.searchArgs = {
            isSearch: args.isSearch,
            extensions: args.extensions,
            fileName: args.fileName,
            fileContent: args.fileContent,
            query: args.query
        }
    }
    getFileDirectory(path) {
        path = path.substring(0, path.lastIndexOf('\\')+1);
        return path;
    }
    getFileName(path) {
        let arr = path.split(/[/\\]/);
        return arr[arr.length-1];
    }
    getFileNameWithoutExtensions(fileName) {
        return fileName.substring(0, fileName.lastIndexOf('.'));
    }
    getFileExtension(path) {
        let arr = path.split('.');
        return arr[arr.length-1];
    }
    getFileList(dir) {
        return new Promise((reslove, reject) => {
            fs.readdir(dir, (err, files) => {
                if(err) reject(err);
                reslove(files);
            });
        });
    }
    pathToStats(path) {
        return new Promise((reslove, reject) => {
            fs.stat(path, (err, stats) => {
                if(err) reject(err);
                reslove(stats);
            });
        });
    }
    parseToNodes(filePaths, node) {
        try{
            let promises = [];
            for(let i = 0; i < filePaths.length; i++){
                let curFilePath = filePaths[i];
                let statsPromise = this.pathToStats(curFilePath);
                let promise = new Promise((reslove, reject) => {
                    statsPromise.then((stats) => {
                        let fileName = this.getFileName(curFilePath);
                        if(stats.isDirectory()) {
                            let pathPromise = this.getFileList(curFilePath);
                            pathPromise.then((paths) => {
                                paths.forEach((item, idx, arr) => {
                                    arr[idx] = curFilePath + '\\' + item;
                                });
                                let folder = {
                                    name: fileName,
                                    kind: 'folder',
                                    url: curFilePath,
                                    children: []
                                }
                                node.push(folder);
                                this.parseToNodes(paths, folder.children).then(() => {
                                    reslove();
                                });
                            });
                        }else {
                            let searchArgs = this.searchArgs;
                            if(!searchArgs.isSearch){
                                node.push({
                                    name: fileName,
                                    kind: 'file',
                                    url: curFilePath
                                });
                                reslove();
                            }else{
                                let filterPromse = new Promise((reslove, reject) => {
                                    // 搜索筛选
                                    let extensions = this.getFileExtension(curFilePath);
                                    let query = searchArgs.query;
                                    let hasContentPromise;
                                    let flag = true; // 该文件是否满足条件
                                    // 如果筛选扩展名
                                    if(searchArgs.extensions && extensions !== this.getFileExtension(query)){
                                        console.log(1);
                                        flag = false;
                                    }
                                    // 如果筛选文件名
                                    if(searchArgs.fileName && fileName.indexOf(this.getFileNameWithoutExtensions(query)) < 0){
                                        console.log(2)
                                        flag = false;
                                    }
                                    // 如果筛选文件内容
                                    if(searchArgs.fileContent){
                                        console.log(3)
                                        hasContentPromise = this.FileHasContent(curFilePath, query);
                                    }
                                    // 如果筛选成功
                                    if(hasContentPromise){
                                        console.log(4)
                                        hasContentPromise().then((isTrue) => {
                                            flag = isTrue;
                                            reslove(flag);
                                        });
                                    }else{
                                        reslove(flag);
                                    }
                                });
                                filterPromse.then((flag) => {
                                    if(flag){
                                        node.push({
                                            name: fileName,
                                            kind: 'file',
                                            url: curFilePath
                                        });
                                    }
                                    reslove();
                                }) 
                            }
                        }
                    });
                });
                promises.push(promise);
            }
            return Promise.all(promises);
        }catch(err) {
            throw err;
        }      
    }
    FileHasContent(path, content) {
        return new Promise((reslove, reject) => {
            this.readFile(path).then((data) => {
                let result = data.indexOf(content) > 0;
                reslove(result);
            });
        });
    }
    readFile(path) {
        return new Promise((reslove, reject) => {
            fs.readFile(path, (err, data) => {
                if(err) {
                    reject(err);
                }
                reslove(data);
            });
        }); 
    }
}

// search
class Search {
    constructor() {
        this.searchInput = document.querySelector("#search");
        this.searchSet = document.querySelector("#search-set");
        this.searchStart = document.querySelector("#search-start");
    }
    initEvent() {
        let searchSet = this.searchSet;
        let searchStart = this.searchStart;
        searchSet.onclick = () => {
            this.openSearchConfigPopup();
        };
        searchStart.onclick = () => {
            this.startSearch();
        };
        ipcRenderer.on("searchArea-reply", (event, paths) => {
            this.searchArea = paths;
        });
    }
    openSearchConfigPopup() {
        let nodes = [
            {
                classNames: ["search-area-wrap", "btn-group"],
                children: [
                    {
                        classNames: ["search-label"],
                        text: "搜索范围"
                    },
                    {
                        classNames: ["search-area-btn", "btn", "btn-blue"],
                        text: "选择目录",
                        events: {
                            click: this.setSearchArea
                        }
                    }
                ]
            },
            {
                classNames: ["search-content"],
                children: [
                    {
                        classNames: ["search-content-title"],
                        text: "搜索内容"
                    },
                    {
                        classNames: ["search-content-item"],
                        children: [
                            {
                                classNames: ["search-label"],
                                kind: "label",
                                text: "文件名",
                                attrs: {
                                    for: "search-filename",
                                }
                            },
                            {
                                type: "checkbox",
                                attrs: {
                                    id: "search-filename",
                                    checked: true
                                },
                                kind: "input",
                            }
                        ]
                    },
                    {
                        classNames: ["search-content-item"],
                        children: [
                            {
                                classNames: ["search-label"],
                                kind: "label",
                                text: "扩展名",
                                attrs: {
                                    for: "search-extensions",
                                }
                            },
                            {
                                type: "checkbox",
                                attrs: {
                                    id: "search-extensions"
                                },
                                kind: "input",
                            }
                        ]
                    },
                    {
                        classNames: ["search-content-item"],
                        children: [
                            {
                                classNames: ["search-label"],
                                kind: "label",
                                text: "文件内容",
                                attrs: {
                                    for: "search-content",
                                }
                            },
                            {
                                type: "checkbox",
                                attrs: {
                                    id: "search-content"
                                },
                                kind: "input",
                            }
                        ]
                    }
                ]
            }
        ];
        const popup = new Popup();
        let filename;
        let extensions;
        let content;
        popup.createPopup(nodes, (root, parent, el) => {
            filename = filename || root.querySelector("#search-filename");
            extensions = extensions || root.querySelector("#search-extensions");
            content = content || root.querySelector("#search-content");
            if(filename){
                this.filename = filename.checked;
            }
            if(extensions){
                this.extensions = extensions.checked;
            }
            if(content){
                this.content = content.checked;
            }
        });
    }
    setSearchArea() {
        return () => {
            ipcRenderer.send("searchArea-message");
        }
    }
    startSearch() {
        // rule
        let searchArea = this.searchArea;
        let filename = this.filename;
        let extensions = this.extensions;
        let content = this.content;
        let query = this.searchInput.value;
        if(!searchArea || !query || !(filename || extensions || content)) {
            alert("请正确设置搜索条件");
        }
        // 搜索文件 --> 获取文件路径和文件名和类型
        let nodes = [];
        let fileParser = new FileParser({
            isSearch: true,
            extensions,
            fileName: filename,
            fileContent: content,
            query
        });
        let nodesPromise = fileParser.parseToNodes(searchArea, nodes);
        nodesPromise.then(() => {
            let directory = new Directory();
            directory.init(nodes);
        });
    }
}

// directory
class Directory {
    constructor() {
        this.directoryPanel = document.querySelector(".directory-panel");
        this.panel = this.directoryPanel.panel;
        this.directoryContent = this.panel.content;
    }
    init(nodes) {
        let root = {
            classNames: ["directory-tree"]
        };
        nodes = this.createNodes(nodes, 1);
        let el = (new Element()).createElement(nodes, root);
        this.directoryContent.appendChild(el);
        this.panel.refreshContentHeight();
    }
    nodeClickHandler(root, parent, el) {
        return (e) => {
            e.stopPropagation();
            let activeNode = root.querySelector(".node.active");
            if(activeNode === el) return;
            if(activeNode){
                ClassList.remove(activeNode, "active");
            }
            ClassList.add(el, "active");
        }
    }
    toggleFolder(root, parent, el) {
        let state = 0;
        let stateArr = ["none", "block"];
        let dropIcon = ["&#xe62d;", "&#xe62c;"];
        return () => {
            let folderContents = Element.getChildren(parent, ".node");
            state = (state + 1) % 2;
            folderContents.forEach((item) => {
                item.style.display = stateArr[state];
            });
            el.innerHTML = dropIcon[state];
            this.panel.refreshContentHeight();
        };
    }
    createNodes(nodes, layer) {
        let arr = [];
        for(let i = 0; i < nodes.length; i++){
            let curNode = nodes[i];
            let node = this.createTmp(layer, curNode.name, curNode.url, curNode.kind,
            curNode.children ? this.createNodes(curNode.children, layer+1) : undefined);
            arr.push(node);
        }
        return arr;
    }
    createContextMenu(el, nodeKind) {
        let directoryContent = this.directoryContent;
        let contextMenu = [
            {
                classNames: ["context-menu-item"],
                text: "复制",
                events: {}
            },
            {
                classNames: ["context-menu-item"],
                text: "剪切",
                events: {}
            },
            {
                classNames: ["context-menu-item"],
                text: "删除",
                events: {}
            },
            {
                classNames: ["context-menu-item"],
                text: "在资源管理器显示",
                events: {}
            }
        ];
        if(nodeKind === 'folder') {
            contextMenu.unshift({
                classNames: ["context-menu-item"],
                text: "新建",
                events: {}
            }, {
                classNames: ["context-menu-item"],
                text: "粘贴",
                events: {}
            });
        }
        const cMenu = new ContextMenu(el, contextMenu);
        const getContextMenu = () => {
            return directoryContent.querySelectorAll('.context-menu');
        };
        cMenu.initEvent((menu) => {
            let contextMenus = getContextMenu();
            for(let i = 0; i < contextMenus.length; i++) {
                let contextMenu = contextMenus[i];
                if(menu !== contextMenu){
                    contextMenu.remove();
                }
            }
        }, () => { 
            getContextMenu().forEach((item) => {
                item.remove();
            }); 
        }); 
    }
    createTmp(layer, name, url, nodeKind, nodes) {
        let icon = nodeKind === 'folder' ? '&#xe635;' : '&#xe65f;';
        let tmp = {
            classNames: [nodeKind+'-node', "node"],
            events: {
                click: this.nodeClickHandler.bind(this),
            },
            fun: (el) => {
                this.createContextMenu(el, nodeKind);
                el.style.textIndent = layer * 20 + 'px';
            },
            attrs: { title: url, name },
            children: [
                {
                    kind: "input",
                    type: "checkbox",
                    classNames: ["select-btn"],
                    events: {
                        click: this.selectNode.bind(this)
                    }
                },
                {
                    classNames: ["icon", "iconfont"],
                    kind: "span",
                    html: icon
                },
                {
                    classNames: ["name"],
                    kind: "span",
                    text: name
                }
            ]
        };
        if(nodes){
            // push drop btn
            tmp.children.push({
                classNames: ["drop-btn", "drop-up", "iconfont"],
                kind: "span",
                html: "&#xe62d;",
                events: {
                    click: this.toggleFolder.bind(this)
                }
            });
            nodes.forEach((item) => {
                tmp.children.push(item);
            });
        }
        return tmp;
    }
    getUnSelectedChildNodes(parent){
        let children = parent.children;
        let unSelectedChildNodes = [];
        for(let i = 0; i < children.length; i++){
            let child = children[i];
            if(ClassList.has(child, 'node')){
                if(!ClassList.has(child, 'selected')){
                    unSelectedChildNodes.push(child);
                }
            }
        }
        return unSelectedChildNodes;
    }
    selectNode(root, parent, el) {
        return () => {
            if(el.checked){
                ClassList.add(parent, 'selected');
                let isFolder = ClassList.has(parent, 'folder-node');
                if(isFolder){
                    let unSelectedChildNodes = this.getUnSelectedChildNodes(parent);
                    console.log(unSelectedChildNodes);
                    unSelectedChildNodes.forEach((item) => {
                        let children = item.children;
                        for(let i = 0; i < children.length; i++){
                            if(ClassList.has(children[i], 'select-btn')){
                                let checkbox = children[i];
                                checkbox.checked = false;
                                checkbox.click();
                                break;
                            }
                        }
                    });
                }
            }else{
                ClassList.remove(parent, 'selected');
            }
        }
    }
}

// contextMenu
class ContextMenu {
    constructor(el, menu) {
        let root = {
            classNames: ["context-menu"],
            fun: (el) => {
                el.style.textIndent = 0;
            }
        }
        this.el = el;
        this.menu = (new Element()).createElement(menu, root);
    }
    initEvent(callback1, callback2) {
        let el = this.el;
        el.addEventListener("contextmenu", (e) => {
            e.stopPropagation();
            e.preventDefault();
            let x = e.clientX;
            let y = e.clientY;
            this.menu.style.left = x + 'px';
            this.menu.style.top = y + 'px';
            el.appendChild(this.menu);
            if(callback1) {
                callback1(this.menu);
            }
        }, false);
        el.addEventListener("click", (e) => {
            e.stopPropagation();
            if(callback2){
                callback2(this.menu);
            }
            this.remove();
        }, false);
    }
    remove() {
        this.menu.remove();
    }
}

class FilerEditor {
    // read
    readFile() {

    }
    // copy
    copyFile() {

    }
    // paste
    pasteFile() {

    }
    // delete
    deleteFile() {

    }
    // cut
    cut() {

    }
}

// 
class Export {
    constructor() {
        this.el = document.querySelector('.files-export');
    }
    initEvent() {
        let el = this.el;
        ipcRenderer.on('output-reply', (event, args) => {
            console.log(args);
        })
        el.addEventListener('click', () => {
            let nodes = this.getSelectedFilesNodes();
            console.log(nodes);
            ipcRenderer.send('output-message', nodes);
        }, false);
    }
    getSelectedFilesNodes() {
        let trees = document.querySelectorAll('.directory-tree');
        let nodes = [];
        for(let i = 0; i < trees.length; i++){
            let tree = trees[i];
            let tmp = this.getSelectedNodesTmp(tree);
            nodes = nodes.concat(tmp);
        }
        
        return nodes;
    }
    getSelectedNodesTmp(root, nodes = []){
        let children = root.children;
        for(let i = 0; i < children.length; i++){
            let child = children[i];
            if(ClassList.has(child, 'folder-node')){
                if(ClassList.has(child, 'selected')){
                    let childrenNodes = [];
                    let name = child.name;
                    let url = child.title;
                    nodes.push({
                        name, url, children: childrenNodes
                    });
                    this.getSelectedNodesTmp(child, childrenNodes);
                }else{
                    this.getSelectedNodesTmp(child, nodes);
                }
            }else if(ClassList.has(child, 'file-node')){
                if(ClassList.has(child, 'selected')){
                    nodes.push({
                        name: child.name,
                        url: child.title
                    });
                }
            }
        }
        
        return nodes;
    }
}

window.addEventListener("load", () => {

    Panel.initPanels();

    const tab = new Tab();
    tab.initEvent();

    const search = new Search();
    search.initEvent();

    const output = new Export();
    output.initEvent();

    Sys.initEvent();

});