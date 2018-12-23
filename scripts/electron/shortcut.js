const { globalShortcut } = require("electron");

class ShortCuts {
    constructor() {
        this.shortCuts = null;
    }
    loadShortCutsConfig() {
        const { shortCuts } = require("../../configs/shortcut");
        this.shortCuts = shortCuts;
        this.setShortCuts();
    }
    setShortCuts() {
        if(this.shortCuts !== null){
            const shortCuts = this.shortCuts;
            for(let key in shortCuts){
                globalShortcut.register(key, shortCuts[key]);
            }
        }
    }
}

const shortCut = new ShortCuts();

function loadShortCutsConfig() {
    shortCut.loadShortCutsConfig();
}

module.exports = {
    loadShortCutsConfig
};