const { globalShortcut } = require("electron");
const fs = require("fs");
const path = require("path");
const { shortCuts, reloadData } = require("../../configs/shortcut");
class ShortCuts {
    constructor(shortCuts) {
        this.shortCuts = shortCuts;
    }
    loadShortCutsConfig() {
        let shortCuts = this.shortCuts;
        if(shortCuts !== null){
            for(let key in shortCuts){
                globalShortcut.register(key, shortCuts[key]);
            }
        }
    }
    reloadShortCutsConfig() {
        // 清空所有快捷键
        globalShortcut.unregisterAll();
        // 重新加载快捷键
        this.loadShortCutsConfig();
    }
}
const shortCut = new ShortCuts(shortCuts);
function loadShortCutsConfig() {
    shortCut.loadShortCutsConfig();
}
function watchShortCutConfig() {
    let configUrl = path.resolve(__dirname, "../../configs/shortcut.json");
    let watcher = fs.watch(configUrl);
    let callbackNum = 0;
    watcher.on("change", (eventType, filename) => {
        if(callbackNum) {
            callbackNum = 0;
        }else {
            callbackNum = 1;
            let shortCutJson = reloadData();
            shortCut.shortCuts = shortCutJson;
            shortCut.reloadShortCutsConfig();
        }
    });
}
module.exports = {
    loadShortCutsConfig,
    watchShortCutConfig
};