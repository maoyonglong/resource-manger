const funcs = require("../scripts/electron/functions");
const { dialog } = require("electron");
const fs = require("fs");
const path = require("path");
const shortCutsJson = require("./shortcut.json");
// 将配置对象的函数名转换成对应函数
function transferFuncs(json) {
    for(let key in json) {
        let funName = json[key];
        let fun = funcs[funName];
        if(fun){
            json[key] = fun;
        }else {
            delete json[key];
            dialog.showErrorBox("快捷键配置错误", "存在不存在功能的配置！");
            break;
        } 
    } 
    return json;
}
// 初始转化
transferFuncs(shortCutsJson);
// 重置
function reloadData() {
    let configUrl = path.resolve(__dirname, "shortcut.json");
    let data = fs.readFileSync(configUrl, "utf8");
    let json = JSON.parse(data);
    transferFuncs(json);
    return json;
}
module.exports = {
    shortCuts: shortCutsJson,
    reloadData
};