import * as dates from './dates.js';

export function showLoading(show) {
    const loader = document.getElementById("loader");
    loader.style.display = show ? "block" : "none";
}

export function displayError(message) {
    const errorDisplay = document.getElementById("errorDisplay");
    errorDisplay.textContent = message;
}

export function clearDisplays() {
    setHidden(document.querySelector(".values-list"), true);
    setHidden(document.getElementById("noData"), true);
    document.getElementById("errorDisplay").textContent = "";
}

export function setToday(day) {
    document.querySelectorAll('input[name="day"]').forEach(
        (e, i) => e.classList.toggle('today', i == day));
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
    employees.forEach((employee) => {
        const option = document.createElement("option");
        option.value = employee;
        option.textContent = employee;
        employeeSelect.appendChild(option);
    });
    if (selectedEmployee && employees.includes(selectedEmployee)) {
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
                listItem.innerText = meal || null;
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

function setHidden(element, value) {
    element.classList.toggle("hidden", value);
}

function getStatusElement() {
    return document.getElementById("noData");
}

function getEmployeeSelect() {
    return document.getElementById("employeeSelect");
}