import * as page from './page.js';
import * as storage from './storage.js';

export function init() {
    page.changeMascot(null, getMascot());
    page.onChangeMascot({ changeMascot });
}

function getMascot() {
    return storage.getMascot() || "cake";
}

function changeMascot() {
    const currentMascot = getMascot();
    const newMascot = currentMascot === "cake" ? "donkey" : "cake";
    page.changeMascot(currentMascot, newMascot);
    storage.setMascot(newMascot);
}
