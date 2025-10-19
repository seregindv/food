import * as page from './page.js';
import * as storage from './storage.js';

const _mascots = [
    { name: "cake", fileName: "cake.png" },
    { name: "donkey", fileName: "donkey.png" }
];

export function init() {
    for (const mascot of _mascots) {
        const img = new Image();
        img.src = mascot.fileName;
    }
    page.changeMascot(null, _mascots[getMascotIndex()]);
    page.onChangeMascot({ changeMascot });
}

function getMascotIndex() {
    const mascotName = storage.getMascot();
    if (!mascotName) {
        return 0;
    }
    const index = _mascots.findIndex(m => m.name === mascotName);
    return index === -1 ? 0 : index;
}

function changeMascot() {
    const currentIndex = getMascotIndex();
    let newIndex = currentIndex + 1;
    if (newIndex >= _mascots.length) {
        newIndex = 0;
    }
    const newMascot = _mascots[newIndex];
    page.changeMascot(_mascots[currentIndex], newMascot);
    storage.setMascot(newMascot.name);
}
