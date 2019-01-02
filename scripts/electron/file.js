const { dialog } = require("electron");
const fs = require("fs");

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

function saveOutputs(path, outputs) {
    let opPromise = new Promise((reslove, reject) => {
        createDirectory(path).then(() => {
            saveFiles(path, outputs).then(() => {
                reslove();
            }).catch(() => {
                reject();
            });
        });
    });
    return opPromise;
}

function saveFiles(path, outputs) {
    return new Promise((reslove, reject) => {
        let promises = [];
        for(let i = 0; i < outputs.length; i++){ 
            promises.push(new Promise((reslove, reject) => {
                let output = outputs[i];
                let dstPath = path + '\\' + output.name;
                let srcPath = output.url;
                // 假设是文件夹
                if(output.children !== undefined) {
                    createDirectory(dstPath).then(() => {
                        saveFiles(dstPath, output.children).then(() => {
                            reslove();
                        });
                    });
                }else {
                    copyFile(srcPath, dstPath).then(() => {
                        reslove();
                    });
                }
            }));
        }
        let allPromise = Promise.all(promises);
        allPromise.then(() => {
            reslove();
        });
    });
}

function createFile(path) {
    let opPromise = new Promise((reslove, reject) => {
        fs.writeFile(path, "", (err) => {
            if(err) {
                reject();
            }
            reslove();
        });
    });
    return opPromise;
}

function createDirectory(path) {
    let opPromise = new Promise((reslove, reject) => {
        fs.exists(path, (exists) => {
            if(!exists){
                fs.mkdir(path, (err) => {
                    if(err){
                        reject(err);
                    }
                    reslove();
                });
            }else{
                reslove();
            }
        }); 
    });
    return opPromise;
}

function copyFile(src, dst) {
    let opPromise = new Promise((reslove, reject) => {
        try{
            let readStream = fs.createReadStream(src);
            let writeStream = fs.createWriteStream(dst);
            readStream.pipe(writeStream);
            reslove();
        }catch(err){
            reject(err);
        }
    });
    return opPromise;
}

module.exports = {
    openFileDialog,
    openDirectoryDialog,
    openSaveDialog,
    saveOutputs,
    createFile,
    createDirectory
};