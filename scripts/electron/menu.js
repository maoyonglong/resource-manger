const { Menu } = require("electron");
const { openDirectory, openFile, resetWindow, openShortCutFile } = require("./functions");
const tmp = [
    {
        "label": "文件",
        "submenu": [
            {
                "label": "打开目录",
                "click": openDirectory
            },
            {
                "label": "打开文件",
                "click": openFile
            }
        ]
    },
    {
        "label": "设置",
        "submenu": [
            {
                "label": "快捷键设置",
                "click": openShortCutFile
            }
        ]
    },
    {
        "label": "窗口",
        "submenu": [
            {
                "label": "重置窗口",
                "click": resetWindow
            }
        ]
    }
]
function initMenu() {
    let fileMenu = Menu.buildFromTemplate(tmp);
    Menu.setApplicationMenu(fileMenu);
}
module.exports = {
    initMenu
}