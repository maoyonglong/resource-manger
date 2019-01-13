const { openDirectoryDialog, openFileDialog } = require("./file");
const path = require("path");
const { shell } = require("electron");
// 打开目录
function openDirectory() {
    openDirectoryDialog().then((paths) => {
        global.win.webContents.send("openDirectory-message", paths);
    })
}
// 打开文件
function openFile() {
    openFileDialog().then((paths) => {
        global.win.webContents.send("openFile-message", paths);
    });
}
// 重置窗口
function resetWindow() {
    global.win.webContents.send("resetWindow-message");
}
// 打开快捷键设置文件
function openShortCutFile() {
    let url = path.resolve(__dirname, "../../configs/shortcut.json");
    shell.openItem(url);

}
module.exports = {
    openDirectory,
    openFile,
    resetWindow,
    openShortCutFile
}