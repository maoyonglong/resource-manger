const { openDirectoryDialog, openFileDialog } = require("./file");

// 打开目录
function openDirectory() {
    openDirectoryDialog().then((paths) => {
        console.log(paths);
    })
}

// 打开文件
function openFile() {
    openFileDialog().then((paths) => {
        console.log(paths);
    });
}

module.exports = {
    openDirectory,
    openFile
}