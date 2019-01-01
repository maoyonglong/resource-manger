const { ipcRenderer, shell, dialog } = require('electron');
const fs = require('fs');
/**
 *  @name ClassList
 *  @description class类名操作对象 
 */
let ClassList = {
    /**
     * @method add
     * @description 给DOM对象添加类名
     * @param { HTMLElement } el 
     * @param { string[, string [, ...]] } className1, classNames2, ...
     */
    add(el, ...classNames) {
        el.classList.add(...classNames);
    },
    /**
     *
     * @method remove
     * @description 移除DOM对象的类名
     * @param { HTMLElement } el 
     * @param { string[, string [, ...]] } className1, classNames2, ...
     */
    remove(el, ...classNames) {
        el.classList.remove(...classNames);
    },
    /**
     * @method has
     * @description 判断DOM对象是否包含某个类名
     * @param { HTMLElement } el 
     * @param { string } className 
     */
    has(el, className) {
        return el.classList.contains(className);
    }
};
/**
 * @class Element
 * @description dom元素操作类
 */
class Element {
    /**
     * @method createElement
     * @for Element
     * @description 创建DOM结点
     * @param { Array } nodes 用JSON数组标志的DOM模板
     * @param { JSON OR HTMLElement } rootNode 根结点 可选
     * @param { boolean } isDom rootNode是否为DOM结点 可选
     * @return { HTMLElement } 模板生成的结点树
     */
    createElement(nodes, rootNode, isDom) {
        let root;
        if(isDom) {
            root = rootNode;
        }else{
            root = rootNode ? this.parseNode(rootNode) : document.createElement("div");
            ClassList.add(root, "root");
        }
        this.root = root;        
        return this.createTree(root, nodes);
    }
    /**
     * @method createTree
     * @for Element
     * @description 按JSON数组模板创建DOM树
     * @param { HTMLElement } parent 父结点
     * @param { Array } nodes DOM对象的JSON数组模板
     * @return { HTMLElement } 按模板生成结点树后的父结点
     */
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
    /**
     * @method parseNode
     * @for Element
     * @description 将JSON对象模板转成DOM结点
     * @param { JSON } curNode JSON对象模板
     * @param { HTMLElement } root 根节点 
     * @param { HTMLElement } parent 父节点
     * @return { HTMLElement } 返回创建的DOM结点
     */
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
                // 将root、parent、el传入事件闭包
                /* 
                    events[key]事件的形式应该是:
                    function(root, parent, el) {
                        // handler
                        return function() {
                            // handler code
                        }
                    }
                 */
                el.addEventListener(key, events[key](root, parent, el), false);
            }
        }
        return el;
    }
    /**
     * @method getChildren
     * @static
     * @for Element
     * @param { HTMLElement } parent 父结点
     * @param { string } selector 选择器表达式
     * @return { HTMLCollection } 孩子结点集合
     */
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
/** 
 * @name Sys
 * @description 系统操作对象
 */
let Sys = {
    // 当前弹出菜单
    contextMenu: undefined,
    /**
     * @method initEvent
     * @description 初始化系统（页面）相关事件
     */
    initEvent() {
        // 添加点击移除页面所有右键菜单的事件
        document.addEventListener("click", () => {
            let contextMenu = document.querySelectorAll('.context-menu');
            contextMenu.forEach((item) => {
                item.remove();
            });
        });
        let fileParser = new FileParser();
        let directory = new Directory();
        // 添加打开目录对话框事件
        ipcRenderer.on('openDirectory-message', (event, paths) => {
            let nodes = [];
            let nodesPromise = fileParser.parseToNodes(paths, nodes);
            nodesPromise.then(() => {
                directory.init(nodes);
            });
        });
        // 添加打开文件对话框事件
        ipcRenderer.on("openFile-message", (event, paths) => {
            let nodes = [];
            console.log(paths)
            let nodesPromise = fileParser.parseToNodes(paths, nodes);
            nodesPromise.then(() => {
                directory.init(nodes);
            });
        });
    }
};
/**
 * @class Panel
 * @description 面板类
 * @constructor 
 *      @param { HTMLElement } panel panel的DOM  
 */ 
class Panel {
    constructor(panel) {
        this.panel = panel;
        // 将panel对象保存到dom
        panel.panel = this; 
        this.dropBtn = panel.querySelector(".drop-btn");
        this.closeBtn = panel.querySelector(".close-btn");
        this.content = panel.querySelector(".panel-content");
    }
    /** 
     * @method getPanels
     * @static 
     * @for Panel
     * @description 获取页面所有panel
     * @return { HTMLCollection } 页面中所有的类名为panel的DOM结点集合
     */
    static getPanels() {
        return document.querySelectorAll(".panel");
    }
    /**
     * @method initPanels
     * @static
     * @for Panel
     * @description 初始化所有panel
     */
    static initPanels() {
        const panels = Panel.getPanels();
        for(let i = 0; i < panels.length; i++){
            const panel = new Panel(panels[i]);
            panel.initEvent();
            panel.refreshContentHeight();
        }
    }
    /**
     * @method initEvent
     * @for Panel
     * @description 初始化panel的事件
     */
    initEvent() {
        // 获取按钮和内容
        let dropBtn = this.dropBtn;
        let closeBtn = this.closeBtn;
        let content = this.content;
        // 记录操作信息
        this.state = 0;
        this.stateArr = ["&#xe62c;", "&#xe62e;"];
        this.heightArr = [content.clientHeight, "0"];
        // 添加下拉按钮点击事件
        dropBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            let state = this.state;
            this.state = state = (state + 1) % 2;
            dropBtn.innerHTML = this.stateArr[state];
            content.style.height = this.heightArr[state] + 'px';
        }, false);
        // 添加关闭按钮点击事件
        closeBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            this.panel.style.display = "none";
        });
    }
    /** 
     * @method refreshContentHeight
     * @for Panel
     * @description 设置或刷新content高度
     */
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
/**
 * @class Tab
 * @description 选项卡类
 */
class Tab{
    /**
     * @method initEvent
     * @for Tab
     * @description 初始化选项卡事件
     */
    initEvent() {
        // 获取页面所有的tab的按钮和内容
        let btns = document.querySelectorAll(".tab-btn");
        let items = document.querySelectorAll(".tab-content-item");
        // 给各个按钮和内容对应添加事件处理
        for(let i = 0; i < btns.length; i++){
            let curBtn = btns[i];
            let curItem = items[i];
            this.addEvent(curBtn, curItem);
        }
    }
    /**
     * @method addEvent
     * @for Tab
     * @description 建立按钮和内容的事件处理关系
     * @param { HTMLElement } 按钮结点
     * @param { HTMLElement } 内容结点
     */
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
    /**
     * @method toggleTab
     * @for Tab
     * @description 切换选项卡的选中和未选中状态
     * @param { HTMLElement } preBtn 之前选中的按钮
     * @param { HTMLElement } preItem 之前选中的内容
     * @param { HTMLElement } curBtn 现在选中的按钮
     * @param { HTMLElement } curItem 现在选中的内容
     */
    toggleTab(preBtn, preItem, curBtn, curItem) {
        ClassList.remove(preBtn, "active");
        ClassList.remove(preItem, "active");
        ClassList.add(curBtn, "active");
        ClassList.add(curItem, "active");
    }   
}
/**
 * @class Popup
 * @description 弹出窗口类
 */
class Popup {
    /**
     * 
     * @param {*} contentNodes 
     * @param {*} callback 
     */
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
// 文件格式化类
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
// 搜索类
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
// 目录类
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
            let activeNode = this.directoryPanel.querySelector(".node.active");
            if(activeNode === el) return;
            if(activeNode){
                ClassList.remove(activeNode, "active");
            }
            ClassList.add(el, "active");
        }
    }
    toggleFolder(root, parent, el) {
        let state = 0;
        let stateArr = [
            "none", 
            "block"
        ];
        let dropIcon = [
            "&#xe62d;", 
            "&#xe62c;"
        ];
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
            let node = this.createTmp(layer, curNode, 
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
                events: {
                    click: (root, parent, el) => {
                        return () => {
                            let nodeCopy = parent.parentNode;
                            // 先清空剪切板
                            Sys.nodePlate = undefined; 
                            // 剪切板的node为nodeCopy
                            Sys.nodePlate = nodeCopy; 
                            // 剪切板是复制状态
                            Sys.nodePlateStatus = 'copy'; 
                        };
                    }
                }
            },
            {
                classNames: ["context-menu-item"],
                text: "剪切",
                events: {
                    click: (root, parent, el) => {
                        return () => {
                            parent.parentNode.style.opacity = '0.5';
                            let nodeCut = parent.parentNode;
                            Sys.nodePlate = undefined;
                            Sys.nodePlate = nodeCut;
                            Sys.nodePlateStatus = 'cut';
                        }  
                    }
                }
            },
            {
                classNames: ["context-menu-item"],
                text: "删除",
                events: {
                    click: (root, parent, el) => {
                        return () => {
                            let tmp = parent.parentNode.tmp;
                            if(parent.parentNode.layer > 1){
                                let oChildren = parent.parentNode.parentNode.children;
                                oChildren.splice(oChildren.indexOf(tmp), 1);
                            }
                            
                            parent.parentNode.remove();
                        } 
                    }
                }
            },
            {
                classNames: ["context-menu-item"],
                text: "在资源管理器显示",
                events: {
                    click: (root, parent, el) => {
                        return () => {
                            shell.showItemInFolder(parent.parentNode.title);
                        };
                    }
                }
            }
        ];
        if(nodeKind === 'folder') {
            contextMenu.unshift({
                classNames: ["context-menu-item"],
                text: "新建",
                events: {
                    click: (root, parent, el) => {
                        return () => {
                            let newNode = document.createElement('div');
                        };
                    }
                }
            }, {
                classNames: ["context-menu-item"],
                text: "粘贴",
                events: {
                    click: (root, parent, el) => {
                        return () => {
                            let nodePaste = Sys.nodePlate;
                            let plateStatus = Sys.nodePlateStatus;
                            let layer = parent.parentNode.layer+1;
                            if(plateStatus === 'copy'){
                                let tmpCopy = JSON.parse(JSON.stringify(nodePaste.tmp));
                                let dChildren = parent.parentNode.tmp.children;
                                dChildren.push(tmpCopy);
                                if(!(tmpCopy instanceof Array)) {
                                    tmpCopy = [tmpCopy];
                                }
                                let nodes = this.createNodes(tmpCopy, layer);
                                (new Element()).createElement(nodes, parent.parentNode, true);
                            }else if(plateStatus === 'cut'){
                                let oChildren = nodePaste.parentNode.tmp.children;
                                oChildren.splice(oChildren.indexOf(nodePaste.tmp), 1);
                                let dChildren = parent.parentNode.tmp.children;
                                dChildren.push(nodePaste.tmp);
                                nodePaste.style.textIndent = layer * 20 + 'px';
                                nodePaste.style.opacity = '1.0';
                                nodePaste.parentNode.removeChild(nodePaste);
                                parent.parentNode.appendChild(nodePaste);
                            }
                        }
                    }
                }
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
    dragstartHandler(root, parent, el) {
        return (e) => {
            e.stopPropagation();
            e.preventDefault();
            e.dataTransfer.setData("html", el);
            e.dataTransfer.dropEffect = 'move';
        };
    }
    dragOverHandler(root, parent, el) {
        return (e) => {
            e.stopPropagation();
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        };
    } 
    dragHandler(root, parent, el) {
        return (e) => {
            e.stopPropagation();
            e.preventDefault();
            let data = e.dataTransfer.getData('html');
            data.remove();
            el.appendChild(data);
        };
    }
    createTmp(layer, curNode, nodes) {
        let name = curNode.name;
        let url = curNode.url;
        let nodeKind = curNode.kind;
        let icon = nodeKind === 'folder' ? '&#xe635;' : '&#xe65f;';
        let tmp = {
            classNames: [
                nodeKind+'-node',
                "node"
            ],
            events: {
                click: this.nodeClickHandler.bind(this),
                dragstart: this.dragstartHandler.bind(this)
            },
            fun: (el) => {
                this.createContextMenu(el, nodeKind);
                el.style.textIndent = layer * 20 + 'px';
            },
            attrs: { 
                title: url, 
                name, 
                tmp: curNode,
                layer,
                draggable: true 
            },
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
                    classNames: [
                        "icon", 
                        "iconfont"
                    ],
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
                classNames: [
                    "drop-btn", 
                    "drop-up", 
                    "iconfont"
                ],
                kind: "span",
                html: "&#xe62d;",
                events: {
                    click: this.toggleFolder.bind(this)
                }
            });
            nodes.forEach((item) => {
                tmp.children.push(item);
            });
            tmp.events.drag = this.dragHandler.bind(this);
            tmp.events.dragover = this.dragOverHandler.bind(this);
        }else{
            tmp.events.dblclick = (root, parent, el) => {
                return () => {
                    shell.openItem(url);
                };
            };
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
        };
    }
}
// 右键菜单类
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
// 导出操作类
class Export {
    /**
     *  构造函数，记录页面导出按钮的dom
     */
    constructor() {
        this.el = document.querySelector('.files-export');
    }
    /**
     *  初始化事件
     */
    initEvent() {
        let el = this.el;
        ipcRenderer.on('output-reply', (event, args) => {
            console.log(args);
        })
        // 添加点击事件监听，导出选择文件
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            // 获取选中文件对应的模板，发送消息给主进程
            let nodes = this.getSelectedFilesNodes();
            ipcRenderer.send('output-message', nodes);
        }, false);
    }
    /**
     *  获取选中文件的模板
     *  @return { Array } 文件模板
     */
    getSelectedFilesNodes() {
        // 获取文件dom树                                                                          
        let trees = document.querySelectorAll('.directory-tree');
        // 获取dom对应的文件模板
        let nodes = [];
        // 遍历各目录树，创建模板
        for(let i = 0; i < trees.length; i++){
            let tree = trees[i];
            let tmp = this.getSelectedNodesTmp(tree);
            nodes = nodes.concat(tmp);
        }                   
        return nodes;
    }
    // 创建文件的模板
    getSelectedNodesTmp(root, nodes = []){
        // 获取下一级目录模板
        let children = root.children;
        // 遍历下一级目录
        for(let i = 0; i < children.length; i++){
            let child = children[i];
            // 如果是文件夹
            if(ClassList.has(child, 'folder-node')){
                // 记录选中文件夹
                if(ClassList.has(child, 'selected')){
                    let childrenNodes = [];
                    let name = child.name;
                    let url = child.title;
                    nodes.push({
                        name, url, children: childrenNodes
                    });
                    this.getSelectedNodesTmp(child, childrenNodes);
                }
                // 如果非选中文件夹，递归遍历再下一级目录
                else{
                    this.getSelectedNodesTmp(child, nodes);
                }
            }
            // 如果是文件，记录选中文件
            else if(ClassList.has(child, 'file-node')){
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
// 页面载入后执行
window.addEventListener("load", () => {
    // 初始化页面所有面板
    Panel.initPanels();
    // 创建选项卡对象
    const tab = new Tab();
    // 初始化页面中选项卡事件
    tab.initEvent();
    // 创建搜索对象
    const search = new Search();
    // 初始化页面中的搜索栏事件
    search.initEvent();
    // 创建导出对象
    const output = new Export();
    // 初始化导出事件
    output.initEvent();
    // 初始化系统事件
    Sys.initEvent();
});