const { app, BrowserWindow, ipcMain } = require("electron");
const { initMenu } = require("./menu");
const { loadShortCutsConfig, watchShortCutConfig } = require("./shortcut");
const { 
  openDirectoryDialog, 
  openFileDialog,
  openSaveDialog,
  saveOutputs,
  createFile, 
  createDirectory,
  deleteFile,
  deleteFolder,
  moveFile,
  moveFolder,
  copyFile,
  copyFolder
} = require("./file");
let win;
function createWindow () {
  win = new BrowserWindow({ width: 800, height: 600, minWidth: 500, minHeight: 500 });
  global.win = win;
  win.loadFile('./pages/index.html');
  win.webContents.openDevTools();
  win.on('closed', () => {
    win = null
  });
}
ipcMain.on("searchArea-message", (event) => {
  openDirectoryDialog().then((paths) => {
    event.sender.send("searchArea-reply", paths);
  });
});
ipcMain.on("output-message", (event, outputs) => {
  openSaveDialog().then((path) => {
    if(typeof path === 'string' && path){
      saveOutputs(path, outputs);
    }
    event.sender.send("output-reply", path);
  });
});
ipcMain.on("createfile-message", (event, url) => {
  createFile(url).then(() => {
    event.sender.send("createfile-reply", "success");
  }).catch(() => {
    event.sender.send("createfile-reply", "fail");
  });
});
ipcMain.on("createfolder-message", (event, url) => {
  createDirectory(url).then(() => {
    event.sender.send("createfolder-reply", "success");
  }).catch(() => {
    event.sender.send("createfolder-reply", "fail");
  }); 
});
ipcMain.on("deletefile-message", (event, path) => {
  console.log(path)
  deleteFile(path).then(() => {
    console.log(1)
    event.sender.send("deletefile-reply", "success");
  }).catch(() => {
    event.sender.send("createfolder-reply", "fail");
  });
});
ipcMain.on("deletefolder-message", (event, path) => {
  deleteFolder(path).then(() => {
    event.sender.send("deletefolder-reply", "success");
  }).catch(() => {
    event.sender.send("deletefolder-reply", "fail");
  });
});

ipcMain.on("movefile-message", (event, src, dst) => {
  moveFile(src, dst).then(() => {
    event.sender.send("movefile-reply", "success");
  }).catch(() => {
    event.sender.send("movefile-reply", "fail");
  });
});
ipcMain.on("movefolder-message", (event, src, dst) => {
  moveFolder(src, dst).then(() => {
    event.sender.send("movefolder-reply", "success");
  }).catch(() => {
    event.sender.send("movefolder-reply", "fail");
  });
});
ipcMain.on("copyfile-message", (event, src, dst) => {
  copyFile(src, dst).then(() => {
    event.sender.send("copyfile-reply", "success");
  }).catch(() => {
    event.sender.send("copyfile-reply", "fail");
  });
});
ipcMain.on("copyfolder-message", (event, src, dst) => {
  copyFolder(src, dst).then(() => {
    event.sender.send("copyfolder-reply", "success");
  }).catch(() => {
    event.sender.send("copyfolder-reply", "fail");
  });
});
app.on('ready', () => {
  // open the window
  createWindow();
  // init the menu
  initMenu();
  // init the shortcut
  loadShortCutsConfig();
  // watch shortcut config file
  watchShortCutConfig();
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
});
app.on('activate', () => {
  if (win === null) {
    createWindow()
  }
});