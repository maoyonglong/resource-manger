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

module.exports = {
    openFileDialog,
    openDirectoryDialog
};