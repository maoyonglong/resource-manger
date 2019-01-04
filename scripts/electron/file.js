const { dialog } = require("electron");
const pathMoudle = require("path");
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
                let dstPath = pathModlue.join(path, output.name);
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

function readDir(path) {
    return new Promise((reslove, reject) => {
        fs.readdir(path, (err, files) => {
            if(err) reject(err);
            reslove(files);
        });
    });
}

function stat(path) {
    return new Promise((reslove, reject) => {
        fs.stat(path, (err, stats) => {
            if(err) reject(err);
            reslove(stats);
        });
    });
}

function deleteFolder(path) {
    return new Promise((reslove, reject) => {
        let promises = [];
        if(fs.existsSync(path)) {
            let readDirPromise = readDir(path);
            readDirPromise.then((files) => {
                files.forEach((file, idx) => {
                    let eachFileProimse = new Promise((reslove, reject) => {
                        let curPath = pathMoudle.join(path, file);
                        let statPromise = stat(curPath);
                        statPromise.then((stat) => {
                            let deleteProimse;
                            if(stat.isDirectory()) {
                                deletePromise = deleteFolder(curPath);
                            }else {
                                deleteProimse = deleteFile(curPath);
                            }
                            deleteProimse.then(() => {
                                reslove();
                            }).catch(() => {
                                reject();
                            });
                        }).catch(() => {
                            reject();
                        });
                    });
                    promises.push(eachFileProimse);
                });
                let allFilePromise = Promise.all(promises);
                allFilePromise.then(() => {
                    reslove();
                }).catch(() => {
                    reject();
                });
            }).catch(()=>{
                reject();
            });
        }else {
            throw "文件夹不存在！";
        }
    });    
}

function deleteFile(path) {
    return new Promise((reslove, reject) => {
        fs.unlink(path, (err) => {
            if(err) reject(err);
            reslove();
        });
    });  
}

function asyncPathExists(path) {
    return new Promise((reslove, reject) => {
        fs.exists(src, (exists) => {
            if(!exists) {
                reject();
            }else {
                reslove();
            }
        });
    });
}

function copyFolder(src, dst) {
    return new Promise((reslove, reject) => {
        let promises = [];
        let srcExistsPromise = asyncPathExists(src);
        srcExistsPromise.then(() => {
            let readPromise = readDir(src);
            readPromise.then((files) => {
                files.forEach((file, idx) => {
                    let eachFileProimse = new Promise((reslove, reject) => {
                        let curSrc = pathMoudle.join(src, file);
                        let statPromise = stat(curSrc);
                        statPromise.then((stat) => {
                            let curDst = pathMoudle.join(dst, file);
                            if(stat.isDirectory()) {
                                let createDirPromise = createDirectory(curDst);
                                createDirPromise.then(() => {
                                    copyFolder(src, curDst).then(() => {
                                        reslove();
                                    }).catch(() => {
                                        reject();
                                    });
                                });
                            }else {
                                copyFile(src, dst).then(() => {
                                    reslove();
                                }).catch(() => {
                                    reject();
                                });
                            }
                        }).catch(() => {
                            reject();
                        });
                    });
                    promises.push(eachFileProimse);
                });
                let allFilePromise = Promise.all(promises);
                allFilePromise.then(() => {
                    reslove();
                }).catch(() => {
                    reject();
                });
            }).catch(() => {
                reject();
            });
        }).catch(() => {
            reject();
        });
    });
}

function moveFolder(src, dst) {
    return new Promise((reslove, reject) => {
        copyFolder(src, dst).then(() => {
            deleteFolder(src);
            reslove();
        }).catch(() => {
            reject();
        });
    });
}

function moveFile(src, dst) {
    return new Promise((reslove, reject) => {
        copyFile(src, dst).then(() => {
            deleteFile(src);
            reslove();
        }).catch(() => {
            reject();
        });
    });
}

module.exports = {
    openFileDialog,
    openDirectoryDialog,
    openSaveDialog,
    saveOutputs,
    createFile,
    createDirectory,
    deleteFolder,
    deleteFile,
    moveFile,
    moveFolder,
    copyFile,
    copyFolder
};