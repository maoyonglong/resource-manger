const { dialog } = require("electron");

function openFileDialog(){
    return new Promise((resolve, reject) => {
        dialog.showOpenDialog(global.win, {
            properties: ["openFile", "multiSelections", "promptToCreate"]
        }, (paths) => {
            resolve(paths);
        });
    });
}

function openDirectoryDialog(){
    return new Promise((resolve, reject) => {
        dialog.showOpenDialog(global.win, {
            properties: ["openDirectory", "multiSelections", "promptToCreate"]
        }, (paths) => {
            resolve(paths);
        });
    });
}

function openSaveDialog() {
    return new Promise((reslove, reject) => {
        dialog.showSaveDialog(global.win, {
            "title": "导出所选文件"
        }, (filename) => {
            reslove(filename);
        });
    });
}

module.exports = {
    openFileDialog,
    openDirectoryDialog,
    openSaveDialog
};