const { Menu } = require("electron");
const { openDirectory, openFile } = require("./functions");
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
    }
]
function initMenu() {
    let fileMenu = Menu.buildFromTemplate(tmp);
    Menu.setApplicationMenu(fileMenu);
}
module.exports = {
    initMenu
}