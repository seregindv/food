import * as dates from './dates.js';

let _refresh;
let _refreshArrow;
let _refreshReady;
let _canCloseSettings = true;
let _settingsVisible = false;

export function showLoading(show) {
    const loader = document.querySelector("#uploadContainer .loader-panel");
    loader.classList.toggle("invisible", !show);
}

export function displayError(message) {
    const errorDisplay = document.getElementById("errorDisplay");
    errorDisplay.textContent = message;
}

export function clearDisplays(refreshing) {
    if (!refreshing) {
        setHidden(document.querySelector(".values-list"), true);
    }
    setHidden(document.getElementById("noData"), true);
    document.getElementById("errorDisplay").textContent = "";
}

export function setToday(day) {
    document.querySelectorAll('input[name="day"]').forEach(
        (e, i) => e.classList.toggle("today", i == day));
}

export function showTitle(show) {
    setHidden(document.getElementById("sheetDates"), !show);
}

export function showSelectors(show) {
    document.getElementById("selectContainer").style.display = show ? "block" : "none";
}

export function populateEmployees(employees, selectedEmployee) {
const employeeSelect = getEmployeeSelect();
    employeeSelect.innerHTML = '<option value="">Выберите сотрудника</option>';
    employees.forEach(employee => {
        const option = document.createElement("option");
        if (!employee.hasMeal) {
            option.classList.add("empty");
        }
        option.value = employee.name;
        option.textContent = employee.name;
        employeeSelect.appendChild(option);
    });
    if (selectedEmployee && employees.some(e => e.name === selectedEmployee)) {
        employeeSelect.value = selectedEmployee;
    }
}

export function getSelectedEmployee() {
    const employeeSelect = getEmployeeSelect();
    return employeeSelect && employeeSelect.value;
}

export function getMeals() {
    const display = document.getElementById("jsonDisplay");
    return {
        show: function (show) {
            setHidden(display.querySelector(".values-list"), !show);
        },
        setNames: function (getName) {
            let i = 0;
            for (const listItem of display.querySelectorAll(".meal-name")) {
                const meal = getName(i);
                const meals = meal?.split("/") || [];
                const divs = listItem.querySelectorAll("div");
                divs[0].innerText = meals[1] || meals[0] || null;
                divs[1].innerText = meals[1] && meals[0] || null;
                setHidden(listItem.closest(".meal"), !meal);
                ++i;
            }
        }
    }
}

export function setStatus(message) {
    const element = getStatusElement();
    setHidden(element, !message);
    element.innerText = message || null;
}

export function setStatusVisibility(visible) {
    setHidden(getStatusElement(), !visible);
}

export function getSelectedDay() {
    const checkedDay = document.querySelector('input[name="day"]:checked');
    return checkedDay && checkedDay.value;
}

export function checkMeals(indexes) {
    const indexSet = new Set(indexes);
    document.querySelectorAll('input[name="meal"]').forEach((e, i) => e.checked = indexSet.has(i));
}

export function onUpload(action) {
    document.getElementById("uploadBtn").addEventListener("click", () => {
        const sheetLink = document.getElementById("sheetLinkInput").value.trim();
        action(sheetLink);
    });
}

export function onEmployeeChanged(action) {
    const employeeSelect = document.getElementById("employeeSelect");
    employeeSelect.addEventListener("change", () => action(employeeSelect.value));
}

export function onDayChanged(action) {
    const days = document.querySelectorAll('input[name="day"]');
    days.forEach(e => e.addEventListener("change", () => action()));
}

export function onMealCheckChanged(action) {
    document.querySelectorAll('input[name="meal"]').forEach(e => e.addEventListener("change", e => {
        const id = /(\d+)$/.exec(e.target.id);
        if (!id) {
            return;
        }
        const index = id[1] - 1;
        const checked = e.target.checked;
        action({ index, checked });
    }));
}

export function onLoaded(action) {
    window.addEventListener("DOMContentLoaded", () => action());
}

export function initDates(sheetDates, onChange) {
    dates.render({
        element: document.getElementById('sheetDates'),
        template: document.getElementById('sheetDate'),
        onChange
    });
    dates.setDates(sheetDates);
}

export function selectDefaultDate() {
    dates.selectDefault();
}

export function setDates(sheetDates) {
    dates.setDates(sheetDates);
}

export function selectDate(dateString) {
    dates.select(dateString);
}

export function getSelectedDate() {
    return dates.getSelectedDate();
}

export function getSelectedDateStatus() {
    return dates.getSelectedDateStatus();
}

export function onRefreshMove(e) {
    const refreshArrow = getRefreshArrow();
    if (e.ready !== _refreshReady) {
        _refreshReady = e.ready;
        refreshArrow.classList.toggle('ready', _refreshReady);
    }
    const turn = _refreshReady ? 0 : (.5 * (1 - e.swipe / e.threshold));
    refreshArrow.style.transform = `rotate(${turn}turn)`;
    _refresh.style.height = e.swipe / 3 + 'px';
}

export function updateRefreshStatus() {
    const refreshArrow = getRefreshArrow();
    const status = dates.getSelectedDateStatus();
    dates.setPriorityClass(refreshArrow, status);
}

export function setupSettingsActions() {
    document.getElementById("showSettings").addEventListener("click", e => {
        showSettings(_settingsVisible ? false : true);
    });
}

export function showSettings(show, canClose = true) {
    _settingsVisible = show;
    document.getElementById("settings").classList.toggle("hidden", !show);
    document.querySelector("#showSettings div").classList.toggle("rotated", show);
    canCloseSettings(canClose);
}

export function canCloseSettings(value) {
    if (value == _canCloseSettings) {
        return;
    }
    document.getElementById("showSettings").disabled = !value;
    _canCloseSettings = value;
}

export function onCopyEatIt(e) {
    document.getElementById("copyEatIt").addEventListener("click", e.action);
}

export function setupMealIcons(icons) {
    const loaderIcons = document.querySelectorAll(".loader-panel .loader");
    for (const icon of icons) {
        const span = document.createElement("span");
        span.textContent = icon;
        loaderIcons.forEach(loaderIcon => loaderIcon.appendChild(span));
    }

    for (let i = 0; i < icons.length; ++i) {
        document.getElementById(`meal${i + 1}`).setAttribute("icon", icons[i]);
    }
}

export function disableCopyEatIt() {
    const copyEatIt = document.getElementById("copyEatIt")
    copyEatIt.disabled = true;
    setTimeout(() => {
        copyEatIt.disabled = false;
    }, 2000);
}

export function ensureRefreshLoader() {
    const refreshLoader = document.querySelector('.refresh-loader');
    if (refreshLoader.querySelector('.loader')) {
        return;
    }
    const refresh = document.querySelector('.loader-panel');
    const cloned = refresh.cloneNode(true);
    cloned.classList.remove('invisible');
    refreshLoader.appendChild(cloned);
}

export function showRefreshLoading() {
    document.querySelector('.refresh-arrow').classList.add('hidden');
    document.querySelector('.refresh-loader').classList.remove('hidden');
}

export function showRefreshArrow() {
    document.querySelector('.refresh-arrow').classList.remove('hidden');
    document.querySelector('.refresh-loader').classList.add('hidden');
}

function getRefreshArrow() {
    if (!_refresh) {
        _refresh = document.querySelector('.refresh');
    }
    if (!_refreshArrow) {
        _refreshArrow = _refresh.querySelector('.refresh-arrow');
    }
    return _refreshArrow;
}

function setHidden(element, value) {
    element.classList.toggle("hidden", value);
}

function getStatusElement() {
    return document.getElementById("noData");
}

function getEmployeeSelect() {
    return document.getElementById("employeeSelect");
}
