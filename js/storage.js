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
    setItem(linkKey(dateString), { main: link });
}

export function setAddedSheetLink(dateString, link, dayNames) {
    const links = getSheetLinks(dateString);
    const selectedDays = new Set(dayNames);
    for (const key of Object.keys(links)) {
        if (key === "main") {
            continue;
        }
        const existingLink = links[key];
        const remainingDays = key.split("-").filter(dayName => !selectedDays.has(dayName));
        delete links[key];
        if (remainingDays.length > 0) {
            links[remainingDays.join("-")] = existingLink;
        }
    }
    links[dayNames.join("-")] = link;
    setItem(linkKey(dateString), links);
}

export function getSheets() {
    const dates = getSheetDates() || [];
    return dates.sort().map(date => {
        const links = getSheetLinks(date);
        const additions = Object.entries(links)
            .filter(([key]) => key !== "main")
            .map(([days, link]) => ({ days, link }));
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
}

export function getEatean(dateString) {
    return getItem(eatenKey(dateString));
}

export function getLink(dateString) {
    return getSheetLinks(dateString).main;
}

export function getSheetLinks(dateString) {
    return getItem(linkKey(dateString)) || { main: null };
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

function setItem(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

function getItem(key) {
    return JSON.parse(localStorage.getItem(key));
}
