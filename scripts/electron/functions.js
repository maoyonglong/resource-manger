const { openDirectoryDialog, openFileDialog } = require("./file");

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

module.exports = {
    openDirectory,
    openFile
}