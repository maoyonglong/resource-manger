const { ipcRenderer, shell, dialog } = require('electron');
const fs = require('fs');
const pathModule = require("path");
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
    /**
     * 
     */
    static getStyle(el) {
        let style = el.currentStyle || getComputedStyle(el);
        return style;
    }
    static addInnerStyle(code) {
        var style = document.createElement('style');
        style.type = 'text/css';
        try{    
            style.appendChild(document.createTextNode(code));
        }catch(e){
            style.cssText = code; // ie,原因与script一样
        }
        var head = document.getElementsByTagName('head')[0];
        head.appendChild(style);
        return style;
    }
    static replaceInnerStyleTag(tag, code) {
        tag.parentNode.removeChild(tag);
        return Element.addInnerStyle(code);
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
        // 添加重置窗口事件
        ipcRenderer.on("resetWindow-message", (event) => {
            let panels = document.querySelectorAll(".panel");
            panels.forEach((val) => {
                val.style.display = "block";
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
            // panel.refreshContentHeight();
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
     * @method createTmp
     * @for Popup
     * @description 创建dom
     * @param { Array } contentNodes dom结点的json表示
     * @param { Function } callback 回调函数
     * @param { HTMLElement } dom结点
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
    /**
     * @method focus
     * @for Popup
     * @description 聚焦提示
     * @param { HTMLElement } root 根结点
     * @param { HTMLElement } parent 父结点
     * @param { HTMLElement } el 当前结点
     * @return { function }
     */
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
    /**
     * @method cancel
     * @for Popup
     * @description 弹窗取消按钮事件
     * @param { HTMLElement } root 根结点
     * @param { HTMLElement } parent 父结点
     * @param { HTMLElement } el 当前结点 
     * @return { function }
     */
    cancel(root, parent, el) {
        return (e) => {
            e.stopPropagation();
            document.body.removeChild(root);
        } 
    }
    /**
     * @method yes
     * @method 
     * @for Popup
     * @description 点击确定按钮后执行的回调函数
     * @param { function } callback 
     */
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
    /**
     * @method createPopup
     * @method 
     * @for Popup
     * @description 创建弹窗
     * @param { Array } nodes 弹窗的内容模板 
     * @param { function } callback 回调函数
     */
    createPopup(nodes, callback) {
        const root = this.createTmp(nodes, callback);
        document.body.appendChild(root);
    }
}
/**
 * @class FileParser
 * @description 文件格式化类
 * @constructor { function(args) => void }   
 */
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
    /**
     * @method getFileDirectory
     * @for FileParser
     * @description 获取目录名
     * @param { string } path 完整路径
     * @return { string } 
     */
    getFileDirectory(path) {
        path = path.substring(0, path.lastIndexOf('\\')+1);
        return path;
    }
    /**
     * @method getFileName
     * @for FileParser
     * @description 获取文件名
     * @param { string } path 完整路径
     * @return { string } 
     */
    getFileName(path) {
        let arr = path.split(/[/\\]/);
        return arr[arr.length-1];
    }
    /**
     * @method getFileNameWithoutExtensions
     * @for FileParser
     * @description 获取文件名（除去扩展名）
     * @param { string } fileName 文件名
     * @return { string }
     */
    getFileNameWithoutExtensions(fileName) {
        let idx = fileName.lastIndexOf('.');
        console.log(idx)
        if(idx >= 0){
            return fileName.substring(0, idx);
        }else {
            return fileName;
        }
    }
    /**
     * @method testStringIgnore
     * @for FileParser
     * @description 忽略大小写测试字符串是否匹配
     * @param { string } 待匹配字符串
     * @param { string } 匹配字符串
     * @return { boolean }
     */
    testStringIgnore(str, query) {
        let re = new RegExp(query, "i");
        return re.test(str);
    }
    /**
     * @method getFileExtension
     * @for FileParser
     * @description 获取文件扩展名
     * @param { string } path 
     * @return { string }
     */
    getFileExtension(path) {
        let arr = path.split('.');
        return arr[arr.length-1];
    }
    /**
     * @method getFileList
     * @for FileParser
     * @description 获取文件夹目录所有文件的文件路径
     * @param { string } dir 
     * @return { Promise }
     */
    getFileList(dir) {
        return new Promise((reslove, reject) => {
            fs.readdir(dir, (err, files) => {
                if(err) reject(err);
                reslove(files);
            });
        });
    }
    /**
     * @method pathToStats
     * @for FileParser
     * @description 将文件路径转成Stats
     * @param { string } path 
     * @return { Promise }
     */
    pathToStats(path) {
        return new Promise((reslove, reject) => {
            fs.stat(path, (err, stats) => {
                if(err) reject(err);
                reslove(stats);
            });
        });
    }
    /**
     * @method parseToNodes
     * @for FileParser
     * @description 生成文件目录树
     * @param { Array } filePaths 文件路径
     * @param { HTMLElement } node 父结点
     */
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
                                // 筛选
                                let searchArgs = this.searchArgs;
                                if(!searchArgs.isSearch) {
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
                                }else {
                                    let flag = true;
                                    let query = searchArgs.query;
                                    // 如果筛选文件夹名
                                    let puleQuery = this.getFileNameWithoutExtensions(query);
                                    console.log(puleQuery, puleQuery)
                                    if(searchArgs.fileName &&  !this.testStringIgnore(fileName, puleQuery)){
                                        flag = false;
                                    }
                                    if(flag) {
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
                                    }else {
                                        this.parseToNodes(paths, node).then(() => {
                                            reslove();
                                        });
                                    }
                                }
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
                                    let puleQuery = this.getFileNameWithoutExtensions(query);
                                    if(searchArgs.fileName &&  !this.testStringIgnore(fileName, puleQuery)){
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
    /**
     * @method FileHasContent
     * @for FileParser
     * @description 判断文件是否含有某字符内容
     * @param { string } path 
     * @param { string } content 
     * @return { Promise }
     */
    FileHasContent(path, content) {
        return new Promise((reslove, reject) => {
            this.readFile(path).then((data) => {
                let result = data.indexOf(content) > 0;
                reslove(result);
            });
        });
    }
    /**
     * @method readFile
     * @for FileParser
     * @description 读文件
     * @param { string } path 
     * @return { Promise }
     */
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
/**
 * @class Search
 * @description 搜索类
 * @constructor { function() => void }
 */
class Search {
    constructor() {
        this.searchInput = document.querySelector("#search");
        this.searchSet = document.querySelector("#search-set");
        this.searchStart = document.querySelector("#search-start");
    }
    /**
     * @method initEvent
     * @for Search
     * @description 初始化事件
     */
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
    /**
     * @method openSearchConfigPopup
     * @for Search
     * @description 打开搜索设置弹窗
     */
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
    /**
     * @method setSearchArea
     * @for Search
     * @description 设置搜索区域
     * @return { function }
     */
    setSearchArea() {
        return () => {
            ipcRenderer.send("searchArea-message");
        }
    }
    /**
     * @method startSearch
     * @for Search
     * @description 开始搜索
     */
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
        nodesPromise.then((flag) => {
            if(flag) {
                let directory = new Directory();
                directory.init(nodes);
            }else {
                alert("没有找到匹配的文件或文件夹");
            } 
        });
    }
}
/**
 * @class Directory
 * @description 目录类
 * @constructor { function() => void }
 */  
class Directory {
    constructor() {
        this.directoryPanel = document.querySelector(".directory-panel");
        this.panel = this.directoryPanel.panel;
        this.directoryContent = this.panel.content;
    }
    /**
     * @method init
     * @for Directory
     * @description 初始化目录树
     * @param { Array } nodes 结点模板
     */
    init(nodes) {
        let root = {
            classNames: ["directory-tree"]
        };
        window.layer = 0;
        nodes = this.createNodes(nodes, 1);
        console.log(window.layer, window.layer*20)
        let nodeWidth = 299 + window.layer * 20;
        window.nodeInnerStyle = Element.addInnerStyle(`
            .directory-tree .node {
                width: ${ nodeWidth }px;
            }
        `);
        document.querySelector(".container-left").style.flexBasis = nodeWidth + "px";
        let el = (new Element()).createElement(nodes, root);
        this.directoryContent.appendChild(el);
        // this.panel.refreshContentHeight();
        // 创建文件
        ipcRenderer.on("createfile-reply", (event, msg) => {
            if(msg === "success") {
                console.log(msg);
            }else {
                alert("创建文件失败！");
            } 
        });
        // 创建文件夹
        ipcRenderer.on("createfolder-reply", (event, msg) => {
            if(msg === "success") {
                console.log(msg);
            }else {
                alert("创建文件夹失败！");
            } 
        });
        // 删除文件
        ipcRenderer.on("deletefile-reply", (events, msg) => {
            if(msg === "success") {
                console.log(msg);
            }else {
                alert("删除文件失败！");
            } 
        });
         // 删除文件夹
         ipcRenderer.on("deletefolder-reply", (events, msg) => {
            if(msg === "success") {
                console.log(msg);
            }else {
                alert("删除文件夹失败！");
            } 
        });
        // 移动文件
        ipcRenderer.on("movefile-reply", (events, msg) => {
            if(msg === "success") {
                console.log(msg);
            }else {
                alert("移动文件失败！");
            } 
        });
        // 移动文件夹
        ipcRenderer.on("movefolder-reply", (events, msg) => {
            if(msg === "success") {
                console.log(msg);
            }else {
                alert("移动文件夹失败！");
            } 
        });
        // 复制粘贴文件
        ipcRenderer.on("copyfile-reply", (events, msg) => {
            if(msg === "success") {
                console.log(msg);
            }else {
                alert("复制文件失败！");
            } 
        });
        // 复制粘贴文件夹
        ipcRenderer.on("copyfolder-reply", (events, msg) => {
            if(msg === "success") {
                console.log(msg);
            }else {
                alert("复制文件夹失败！");
            } 
        });
    }
    /**
     * @method nodeClickHandler
     * @for Directory
     * @description 目录树结点点击事件函数
     * @param { HTMLElement } root 根结点
     * @param { HTMLElement } parent 父结点
     * @param { HTMLElement } el 当前结点
     * @return { function }
     */
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
    /**
     * @method toggleFolder
     * @for Directory
     * @description 文件夹结点的折叠和展开
     * @param { HTMLElement } root 
     * @param { HTMLElement } parent 
     * @param { HTMLElement } el 
     * @return { function }
     */
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
            // this.panel.refreshContentHeight();
        };
    }
    /**
     * @method createNodes
     * @for Directory
     * @description 创建结点模板
     * @param { Array } nodes 目录模板
     * @param { Number } layer 层数
     * @return { Array } 
     */
    createNodes(nodes, layer) {
        let arr = [];
        if(window.layer < layer) {
            window.layer = layer;
        }
        for(let i = 0; i < nodes.length; i++){
            let curNode = nodes[i];
            let node = this.createTmp(layer, curNode, 
            curNode.children ? this.createNodes(curNode.children, layer+1) : undefined);
            arr.push(node);
        }
        return arr;
    }
    /**
     * @method createContextMenu
     * @for Directory
     * @description 创建右键菜单
     * @param { HTMLElement } el 当前结点
     * @param { string } nodeKind 结点类型
     */
    createContextMenu(el, nodeKind) {
        let directoryContent = this.directoryContent;
        let contextMenu = [
            {
                classNames: ["context-menu-item"],
                text: "复制",
                events: {
                    click: (root, parent, el) => {
                        return (e) => {
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
                        return (e) => {
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
                        return (e) => {
                            let tmp = parent.parentNode.tmp;
                            if(parent.parentNode.layer > 1){
                                let oChildren = parent.parentNode.parentNode.children;
                                oChildren = [].slice(oChildren);
                                oChildren.splice(oChildren.indexOf(tmp), 1);
                            }
                            let kind = ClassList.has(parent.parentNode, "folder-node") ? "folder" : "file";
                            let url = parent.parentNode.title;
                            parent.parentNode.remove();
                            ipcRenderer.send("delete" + kind + "-message", url);
                        } 
                    }
                }
            },
            {
                classNames: ["context-menu-item"],
                text: "在资源管理器显示",
                events: {
                    click: (root, parent, el) => {
                        return (e) => {
                            e.stopPropagation();
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
                        return (e) => {
                            let popup = new Popup();
                            let popupNodes = [
                                {
                                    classNames: ['newfile-input-wrap'],
                                    children: [
                                        {
                                            classNames: ['newfile-input-label'],
                                            kind: 'label',
                                            attrs: {
                                                for: 'newfile-input'
                                            },
                                            text: '文件/文件夹名字'
                                        },
                                        {
                                            classNames: ['newfile-input'],
                                            kind: 'input',
                                            attrs: {
                                                id: 'newfile-input',
                                                placeholder: 'example/example.txt'
                                            }
                                        }
                                    ]
                                },
                                {
                                    classNames: ['newfile-select-wrap'],
                                    children: [
                                        {
                                            classNames: ['newfile-select'],
                                            kind: "input",
                                            type: "radio",
                                            attrs: {
                                                id: 'newfile-select-file',
                                                name: "newfile-select-radio"
                                            }
                                        },
                                        {
                                            classNames: ['newfile-select-label'],
                                            kind: "label",
                                            attrs: {
                                                for: "newfile-select-file"
                                            },
                                            text: "文件"
                                        },
                                        {
                                            classNames: ["newfile-select"],
                                            kind: "input",
                                            type: "radio",
                                            attrs: {
                                                id: "newfile-select-folder",
                                                name: "newfile-select-radio"
                                            }
                                        },
                                        {
                                            classNames: ["newfile-select-label"],
                                            kind: "label",
                                            attrs: {
                                                for: "newfile-select-file"
                                            },
                                            text: "文件夹"
                                        }
                                    ]
                                }
                            ];
                            let nameInput;
                            let fileRadio;
                            let folderRadio;
                            let parentNode = parent.parentNode;
                            popup.createPopup(popupNodes, (popupRoot) => {
                                nameInput = nameInput || popupRoot.querySelector('#newfile-input');
                                fileRadio = fileRadio || popupRoot.querySelector("#newfile-select-file");
                                folderRadio = folderRadio || popupRoot.querySelector('#newfile-select-folder');
                                if(!nameInput.value) {
                                    alert("文件名不能为空！");
                                    return;
                                }
                                if(!fileRadio.checked && !folderRadio.checked) {
                                    alert("没有选择创建类型！");
                                    return;
                                }
                                let name = nameInput.value;
                                let url = parentNode.title + '\\' + name;
                                let kind = fileRadio.checked ? "file" : "folder";
                                let layer = parentNode.layer + 1;
                                let node = {
                                    name,
                                    url,
                                    kind,
                                    children: []
                                }; 
                                let tmp = this.createTmp(layer, node);
                                if(layer > window.layer) {
                                    window.layer = layer;
                                    window.nodeInnerStyle = Element.addInnerStyle(`
                                        .directory-tree .node {
                                            width: ${ 299 + window.layer * 20 }px;
                                        }
                                    `);
                                }
                                let element = new Element();
                                element.createElement([tmp], parentNode, true);
                                parent.remove();
                                // this.panel.refreshContentHeight();
                                ipcRenderer.send("create" + kind + "-message", url);
                            });
                        };
                    }
                }
            }, {
                classNames: ["context-menu-item"],
                text: "粘贴",
                events: {
                    click: (root, parent, el) => {
                        return (e) => {
                            let nodePaste = Sys.nodePlate;
                            let plateStatus = Sys.nodePlateStatus;
                            let layer = parent.parentNode.layer+1;
                            let kind = "folder";
                            if(plateStatus === 'copy'){
                                let tmpCopy = JSON.parse(JSON.stringify(nodePaste.tmp));
                                let dChildren = parent.parentNode.tmp.children;
                                dChildren.push(tmpCopy);
                                if(!(tmpCopy instanceof Array)) {
                                    tmpCopy = [tmpCopy];
                                    kind = "file";
                                }
                                let nodes = this.createNodes(tmpCopy, layer);
                                (new Element()).createElement(nodes, parent.parentNode, true);
                                let src = nodePaste.title;
                                let dst = pathModule.join(parent.parentNode.title, nodePaste.name);
                                if(src === dst) {
                                    dst = dst + (new Date());
                                }
                                ipcRenderer.send("copy" + kind + "-message", src, dst);
                            }else if(plateStatus === 'cut'){
                                let oChildren = nodePaste.parentNode.tmp.children;
                                oChildren.splice(oChildren.indexOf(nodePaste.tmp), 1);
                                console.log(oChildren);
                                let dChildren = parent.parentNode.tmp.children;
                                dChildren.push(nodePaste.tmp);
                                nodePaste.style.textIndent = layer * 20 + 'px';
                                nodePaste.style.opacity = '1.0';
                                nodePaste.parentNode.removeChild(nodePaste);
                                parent.parentNode.appendChild(nodePaste);
                                let src = nodePaste.title;
                                let dst = pathModule.join(parent.parentNode.title, nodePaste.name);
                                if(src === dst) {
                                    dst = dst + (new Date());
                                }
                                let kind = ClassList.has(nodePaste, 'folder-node') ? 'folder' : 'file';
                                ipcRenderer.send("move" + kind + "-message", src, dst);
                            }
                            // this.panel.refreshContentHeight();
                            if(layer > window.layer) {
                                window.layer = layer;
                                window.nodeInnerStyle = Element.addInnerStyle(`
                                    .directory-tree .node {
                                        width: ${ 299 + window.layer * 20 }px;
                                    }
                                `);
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
    /**
     * @method drag
     * @for Directory
     * @description 拖拽事件监听
     * @param { HTMLElement  } root 根结点
     * @param { HTMLElement } parent 父结点
     * @param { HTMLElement } el 当前结点
     * @return { function }
     */
    dragHandler(root, parent, el) {
        return (e) => {
            e.stopPropagation();
        };
    }
    /**
     * @method dragstartHandler
     * @for Directory
     * @description 结点拖拽开始事件监听
     * @param { HTMLElement } root 根结点
     * @param { HTMLElement } parent 父结点
     * @param { HTMLElement } el 当前结点
     * @return { function }
     */   
    dragstartHandler(rootparent, el) {
        return (e) => {
            e.stopPropagation();
            // 保存拖动元素的引用(ref.)
            Sys.dragged = e.target;
            // 使其半透明
            e.target.style.opacity = .5;
        };
    }
    /**
     * @method dragendHandler
     * @for Directory
     * @description 拖拽结束事件监听
     * @param { HTMLElement } root 根结点
     * @param { HTMLElement } parent 父结点
     * @param { HTMLElement } el 当前结点
     * @return { function }
     */   
    dragendHandler(root, rent, el) {
        return (e) => {
            e.stopPropagation();
            e.target.style.opacity = "";
        };
    }
    /**
     * @method dragoverHandler
     * @for Directory
     * @description 拖拽覆盖事件监听
     * @param { HTMLElement } root 根结点
     * @param { HTMLElement } parent 父结点
     * @param { HTMLElement } el 当前结点
     * @return { function }
     */
    dragoverHandler(root, parent, el) {
        return (e) => {
            e.preventDefault();
            e.stopPropagation();
        };
    } 
    /**
     * @method dragenterHandler
     * @for Directory
     * @description 拖拽进入可放置结点的事件监听
     * @param { HTMLElement } root 根结点
     * @param { HTMLElement } parent 父结点
     * @param { HTMLElement } el 当前结点
     * @return { function }
     */
    dragenterHandler(root, parent, el) {
        return (e) => {
            e.stopPropagation();
            if(ClassList.has(e.target, 'folder-node')) {
                e.target.style.backgroundColor = 'purple';
            }
        };
    }
    /**
     * @method dragleaveHandler
     * @for Directory
     * @description 拖拽离开可放置结点的事件监听
     * @param { HTMLElement } root 根结点
     * @param { HTMLElement } parent 父结点
     * @param { HTMLElement } el 当前结点
     * @return { function }
     */
    dragleaveHandler(root, parent, el) {
        return (e) => {
            e.stopPropagation();
            if(ClassList.has(e.target, 'folder-node')) {
                e.target.style.backgroundColor = '';
            }
        };
    }
    /**
     * @method dropHandler
     * @for Directory
     * @description 拖拽放置的事件监听
     * @param { HTMLElement } root 根结点
     * @param { HTMLElement } parent 父结点
     * @param { HTMLElement } el 当前结点
     * @return { function }m
     */    
    dropHandler(root, parent, el) {
        return (e) => {
            e.preventDefault();
            e.stopPropagation();
            if(ClassList.has(e.target, 'folder-node')) {
                let dragged = Sys.dragged;
                console.log(dragged)
                if(!ClassList.has(dragged, 'node')){
                    dragged = dragged.parentNode;
                }
                e.target.style.backgroundColor = '';
                let layer = e.target.layer + 1;
                dragged.layer = layer;
                dragged.style.textIndent = 20 * layer + 'px';
                dragged.remove();
                e.target.appendChild( dragged );
                if(layer > window.layer) {
                    window.layer = layer;
                    window.nodeInnerStyle = Element.addInnerStyle(`
                        .directory-tree .node {
                            width: ${ 299 + window.layer * 20 }px;
                        }
                    `);
                }
                let src = dragged.title;
                let dst = pathModule.join(e.target.title, dragged.name);
                let kind = dragged.tmp.kind === "file" ? "file" : "folder";
                if(src === dst) {
                    dst = dst + (new Date());
                }
                ipcRenderer.send("move" + kind + "-message", src, dst);
            }
        };
    }
    /**
     * @method createTmp
     * @for Directory
     * @description 创建目录结点模板
     * @param { Number } layer 结点层数
     * @param { json } curNode 当前结点
     * @param { nodes } 目录模板
     * @return { json }
     */
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
                drag: this.dragHandler.bind(this),
                dragstart: this.dragstartHandler.bind(this),
                dragend: this.dragendHandler.bind(this),
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
        if(nodeKind === 'folder'){
            // push drop btn
            tmp.children.splice(1, 0, {
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
            if(nodes){
                nodes.forEach((item) => {
                    tmp.children.push(item);
                });
            }
            // tmp.attrs.draggable =  true 
            tmp.events.dragover = this.dragoverHandler.bind(this);
            tmp.events.dragenter = this.dragenterHandler.bind(this);
            tmp.events.dragleave = this.dragleaveHandler.bind(this);
            tmp.events.drop = this.dropHandler.bind(this);
        }else{
            tmp.events.dblclick = (root, parent, el) => {
                return () => {
                    shell.openItem(url);
                };
            };
        }
        return tmp;
    }
    /**
     * @method getUnSelectedChildNodes
     * @for Directory
     * @description 获取未选中孩子结点
     * @param { HTMLElement } parent 父结点
     * @return { HTMLElement }
     */
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
    /**
     * @method selectNode
     * @for Directory
     * @description 结点选中事件监听
     * @param { HTMLElement } root 根结点
     * @param { HTMLElement } parent 父结点
     * @param { HTMLElement } el 当前结点
     * @return { function }
     */
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
/**
 * @class ContextMenu
 * @description 右键菜单类
 * @constructor { function(el, menu) => void }
 */
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
    /**
     * @method initEvent
     * @for ContextMenu
     * @description 初始化监听事件
     * @param { function } callback1 右键菜单事件回调
     * @param { function } callback2 菜单项点击回调
     */
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
    /**
     * @method remove
     * @for ContextMenu
     * @description 移除右键菜单
     */
    remove() {
        this.menu.remove();
    }
}
/**
 * @class Export
 * @description 导出操作类
 * @constructor { function() => void }
 */
class Export {
    constructor() {
        this.el = document.querySelector('.files-export');
    }
    /**
     * @method initEvent
     * @for Export
     * @description 初始化事件
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
     * @method getSelectedFilesNodes
     * @for Export
     * @description 获取选中文件的模板
     * @return { Array } 文件模板
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
    /**
     * @method getSelectedNodesTmp
     * @for Export
     * @description 创建选中文件的模板
     * @param { HTMLElement } root 根结点
     * @param { Array } nodes 模板
     * @return { Array }
     */
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
/**
 * 
 */
class DragBar {
    constructor($left, $right, $dragBar) {
        this.$left = $left;
        this.right = $right;
        this.$dragBar = $dragBar;
    }
    initEvent() {
        let $left = this.$left;
        let $right = this.$right;
        let $dragBar = this.$dragBar;
        let isMove = false;
        let startX;
        let flexBasis = Element.getStyle($left).flexBasis;
        let originBasis = parseInt(flexBasis);
        $dragBar.addEventListener("mousedown", function(e) {
            isMove = true;
            startX = e.clientX;
            $dragBar.style.cursor = "e-resize";
        }, false);
        $dragBar.addEventListener("mousemove", function(e) {
            e.preventDefault();
            if(isMove) {
                let endX = e.clientX;
                let distance = endX - startX; 
                if(distance === 0) return;
                let nowBasis = originBasis + distance;
                if(nowBasis >= 299){
                    $left.style.flexBasis = nowBasis + "px";
                }    
                if(window.nodeInnerStyle){
                    // let oneNode = document.querySelector(".node");
                    // let width = Element.getStyle(oneNode).width;
                    // width = parseInt(width);
                    // let targetWidth = width + distance;
                    // console.log(width, distance, targetWidth);
                    if(nowBasis >= 299) {
                        window.nodeInnerStyle = Element.replaceInnerStyleTag(window.nodeInnerStyle, `
                            .directory-tree .node {
                                width: ${ nowBasis }px;
                            }
                        `);
                    }
                }
            }
        }, false);
        $dragBar.addEventListener("mouseup", function(e) {
            isMove = false;
            $dragBar.style.cursor = "pointer";
            let flexBasis = Element.getStyle($left).flexBasis;
            originBasis = parseInt(flexBasis);
        }, false);
        $dragBar.addEventListener("mouseout", function() {
            isMove = false;
            $dragBar.style.cursor = "pointer";
            let flexBasis = Element.getStyle($left).flexBasis;
            originBasis = parseInt(flexBasis);
        }, false);
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
    // 初始化dragBar
    let $left = document.querySelector(".container-left");
    let $right = document.querySelector(".container-right");
    let $dragBar = document.querySelector(".drag-bar");
    let dragBar = new DragBar($left, $right, $dragBar);
    dragBar.initEvent();
    // 初始化系统事件
    Sys.initEvent();
});