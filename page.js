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
    document.querySelector(".values-list").classList.toggle("hidden", true);
    document.getElementById("noData").classList.toggle("hidden", true);
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
    document.querySelector(".sheet-title").classList.toggle("hidden", !show);
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

function getEmployeeSelect() {
    return document.getElementById("employeeSelect");
}