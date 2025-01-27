export function dropOldSheets(mondayString) {
    const sheetInfo = getInfo();
    if (!sheetInfo || !sheetInfo.dates || !sheetInfo.dates[0]) {
        return;
    }
    const dates = sheetInfo.dates;
    let i = 0;
    let changed;
    while (i < dates.length) {
        const date = dates[i];
        if (date >= mondayString) {
            continue;
        }
        dates = dates.splice(i, 1);
        localStorage.removeItem(eatenKey(date));
        localStorage.removeItem(dataKey(date));
        changed = true;
    }
    if (changed) {
        sheetInfo.dates = dates;
        setInfo(sheetInfo);
    }
}

export function setSheetData(dateString, data) {
    const sheetInfo = getInfo() || {};
    const dates = sheetInfo.dates;
    if (!dates) {
        sheetInfo.dates = [dateString];
    } else if (!dates.includes(dateString)) {
        dates.push(dateString);
    }
    localStorage.removeItem(eatenKey(dateString));
    setItem(dataKey(dateString), data);
    setInfo(sheetInfo);
}

export function getSheetData(dateString) {
    return getItem(`sheetData${dateString}`);
}

export function getInfo() {
    return getItem("sheetInfo");
}

function setInfo(data) {
    setItem("sheetInfo", data);
}

function dataKey(dateString) {
    return `sheetData${dateString}`;
}

function eatenKey(dateString) {
    return `eaten${dateString}`;
}

function setItem(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

function getItem(key) {
    return JSON.parse(localStorage.getItem(key));
}
