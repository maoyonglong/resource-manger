const { openDirectory, openFile } = require("../scripts/electron/functions");
const shortCuts = {
    "Ctrl+O": openFile,
    "Alt+O": openDirectory,
};
module.exports = {
    shortCuts
}