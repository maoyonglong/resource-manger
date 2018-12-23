const { app, BrowserWindow, ipcMain } = require("electron");
const { initMenu } = require("./menu");
const { loadShortCutsConfig } = require("./shortcut");
const { openDirectoryDialog, openFileDialog } = require("./file");

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

ipcMain.on("openDirectory-message", (event) => {
  openDirectoryDialog().then((paths) => {
    event.sender.send("openDirectory-reply", paths);
  });
});

app.on('ready', () => {
  // open the window
  createWindow();
  // init the menu
  initMenu();
  // init shortcut
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