const { app, BrowserWindow, ipcMain } = require("electron");
const { initMenu } = require("./menu");
const { loadShortCutsConfig } = require("./shortcut");
const { openDirectoryDialog, openFileDialog, openSaveDialog, saveOutputs } = require("./file");

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

app.on('ready', () => {
  // open the window
  createWindow();
  // init the menu
  initMenu();
  // init the shortcut
  loadShortCutsConfig();
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