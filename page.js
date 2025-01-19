export const sheetStatus = {
    late: 'late',
    normal: 'normal',
    early: 'early'
};

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

export function setSheetStatus(status) {
    const sheetStatusElement = document.getElementById("sheetStatus")
    sheetStatusElement.classList.remove(sheetStatus.late, sheetStatus.early, sheetStatus.normal)
    sheetStatusElement.classList.add(status);
}

export function setToday(isToday) {
    document.querySelectorAll('input[name="day"]').forEach(
        (e, i) => e.classList.toggle('today', isToday(i)));
}

export function showTitle(show) {
    setHidden(document.querySelector(".sheet-title"), !show);
}

export function setTitle(title) {
    document.getElementById("sheetTitle").textContent = title;
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

function setHidden(element, value) {
    element.classList.toggle("hidden", value);
}

function getStatusElement() {
    return document.getElementById("noData");
}

function getEmployeeSelect() {
    return document.getElementById("employeeSelect");
}