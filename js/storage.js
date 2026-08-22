export function dropOldSheets(mondayString) {
    const dates = getSheetDates();
    if (!dates || !dates[0]) {
        return;
    }
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
        localStorage.removeItem(linkKey(date));
        localStorage.removeItem(foodInfoKey(date));
        changed = true;
    }
    if (changed) {
        setSheetDates(dates);
    }
}

export function setSheetData(dateString, data, link) {
    setItem(dataKey(dateString), data);
    if (!link) {
        return;
    }

    let dates = getSheetDates();
    let datesChanged;
    if (!dates) {
        dates = [dateString];
        datesChanged = true;
    } else if (!dates.includes(dateString)) {
        dates.push(dateString);
        datesChanged = true;
    }
    if (datesChanged) {
        setSheetDates(dates);
    }
    setItem(linkKey(dateString), { main: link, days: [], menu: [] });
}

export function setAddedSheetLink(dateString, link, dayNames) {
    const links = getSheetLinks(dateString);
    const selectedDays = new Set(dayNames);
    links.days = links.days
        .map(entry => entry.mode === "replace"
            ? { ...entry, days: entry.days.filter(day => !selectedDays.has(day)) }
            : entry)
        .filter(entry => entry.days.length > 0);
    links.days.push({ link, days: dayNames, mode: "replace" });
    setItem(linkKey(dateString), links);
}

export function setAddedFoodLink(dateString, link, dayName) {
    const links = getSheetLinks(dateString);
    links.days = links.days.filter(entry =>
        entry.mode !== "add" || !entry.days.includes(dayName));
    links.days.push({ link, days: [dayName], mode: "add" });
    setItem(linkKey(dateString), links);
}

export function addMenuLink(dateString, link) {
    const links = getSheetLinks(dateString);
    links.menu.push(link);
    setItem(linkKey(dateString), links);
}

export function getSheets() {
    const dates = getSheetDates() || [];
    return dates.sort().map(date => {
        const links = getSheetLinks(date);
        const additions = links.days.map(entry => ({
            days: `${entry.mode === "add" ? "+" : ""}${entry.days.join("-")}`,
            link: entry.link
        }));
        additions.push(...links.menu.map(link => ({ days: "меню", link })));
        return { date, link: links.main, additions };
    });
}

export function deleteSheet(dateString) {
    const dates = getSheetDates() || [];
    const index = dates.indexOf(dateString);
    if (index !== -1) {
        dates.splice(index, 1);
        setSheetDates(dates);
    }
    localStorage.removeItem(eatenKey(dateString));
    localStorage.removeItem(dataKey(dateString));
    localStorage.removeItem(linkKey(dateString));
    localStorage.removeItem(foodInfoKey(dateString));
}

export function getEatean(dateString) {
    return getItem(eatenKey(dateString));
}

export function getLink(dateString) {
    return getSheetLinks(dateString).main;
}

export function getSheetLinks(dateString) {
    return getItem(linkKey(dateString)) || { main: null, days: [], menu: [] };
}

export function setEaten(dateString, data) {
    return setItem(eatenKey(dateString), data);
}

export function clearEatenDays(dateString, dayNames) {
    const eaten = getEatean(dateString);
    if (!eaten) {
        return;
    }
    for (const employeeData of Object.values(eaten)) {
        dayNames.forEach(dayName => delete employeeData[dayName]);
    }
    setEaten(dateString, eaten);
}

export function getSheetData(dateString) {
    return getItem(dataKey(dateString));
}

export function setFoodInfo(dateString, data) {
    setItem(foodInfoKey(dateString), data);
}

export function getFoodInfo(dateString) {
    return getItem(foodInfoKey(dateString));
}

export function getSheetDates() {
    return getItem("sheetDates");
}

export function getMascot() {
    return getItem("mascot")?.name;
}

export function setMascot(mascot) {
    setItem("mascot", { name: mascot });
}

function setSheetDates(data) {
    setItem("sheetDates", data);
}

function dataKey(dateString) {
    return `sheetData_${dateString}`;
}

function linkKey(dateString) {
    return `sheetLink_${dateString}`;
}

function eatenKey(dateString) {
    return `eaten_${dateString}`;
}

function foodInfoKey(dateString) {
    return `foodInfo_${dateString}`;
}

function setItem(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

function getItem(key) {
    return JSON.parse(localStorage.getItem(key));
}
