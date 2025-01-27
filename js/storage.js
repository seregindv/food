export function dropOldSheets(mondayString) {
    const sheetInfo = getInfo();
    if (!sheetInfo || !sheetInfo.dates || !sheetInfo.dates[0]) {
        return;
    }
    let dates = sheetInfo.dates;
    let i = 0;
    let changed;
    while (i < dates.length) {
        const date = dates[i];
        if (date >= mondayString) {
            i++;
            continue;
        }
        dates.splice(i, 1);
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

export function getEatean(dateString) {
    return getItem(eatenKey(dateString));
}

export function setEaten(dateString, data) {
    return setItem(eatenKey(dateString), data);
}

export function getSheetData(dateString) {
    return getItem(dataKey(dateString));
}

export function getInfo() {
    return getItem("sheetInfo");
}

function setInfo(data) {
    setItem("sheetInfo", data);
}

function dataKey(dateString) {
    return `sheetData_${dateString}`;
}

function eatenKey(dateString) {
    return `eaten_${dateString}`;
}

function setItem(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

function getItem(key) {
    return JSON.parse(localStorage.getItem(key));
}
