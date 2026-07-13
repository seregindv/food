import * as page from './page.js';
import * as storage from './storage.js';
import * as mealState from './meal-state.js';
import * as share from './share.js';

export function populateEmployeeSelect(data) {
  const employees = Object.keys(data).sort().map(employee => ({ name: employee, hasMeal: !!Object.keys(data[employee])[0] }));
  const selectedEmployee = localStorage.getItem("selectedEmployee");
  page.populateEmployees(employees, selectedEmployee);
  if (!data) {
    page.showSettings(true, false);
  }
}

export function selectDefaultDay() {
  const currentDay = getDefaultSelect();
  currentDay.checked = true;
}

export function displaySelectedData(mealOnly) {
  page.setStatusVisibility(false);
  const meals = page.getMeals();
  const radios = document.querySelectorAll('input[name="day"]');
  const selectedEmployee = page.getSelectedEmployee();

  if (!selectedEmployee) {
    radios.forEach(r => { r.disabled = true; r.checked = false; });
    meals.show(false);
    return;
  }

  const selectedDate = page.getSelectedDate();
  const sheetData = storage.getSheetData(selectedDate) || {};
  const selectedDay = page.getSelectedDay();
  let selectedDayIndex = selectedDay.index;
  let selectedDayName = selectedDay.name;
  if (!selectedDayName) {
    const defaultSelectId = getDefaultSelectId();
    const defaultSelect = getDefaultSelect(defaultSelectId);
    selectedDayName = defaultSelect.value;
    selectedDayIndex = defaultSelectId - 1;
    defaultSelect.checked = true;
  }

  const employeeData = sheetData[selectedEmployee];
  if (!mealOnly) {
    let uncheckedIndex;
    let i = 0;
    for (const radio of radios) {
      const radioData = employeeData && employeeData[radio.value];
      const disabled = !radioData || radioData.length === 0;
      radio.disabled = disabled
      if (uncheckedIndex !== undefined && !disabled) {
        uncheckedIndex = undefined;
        radio.checked = true;
        selectedDayName = radio.value;
        selectedDayIndex = i;
      }
      if (disabled && radio.checked) {
        radio.checked = false;
        selectedDayName = undefined;
        selectedDayIndex = undefined;
        uncheckedIndex = i;
      }
      ++i;
    }
    if (uncheckedIndex !== undefined) {
      for (let i = uncheckedIndex; i >= 0; i--) {
        const radio = radios[i];
        if (!radio.disabled) {
          radio.checked = true;
          selectedDayName = radio.value;
          selectedDayIndex = i;
          break;
        }
      }
    }
  }
  if (employeeData) {
    share.setWarningForDay(selectedDayIndex);
    const employeeMeals = employeeData[selectedDayName];
    renderMeals(meals, employeeMeals, selectedDayName);
  } else {
    meals.show(false);
    page.setStatus("Нет еды для сотрудника");
  }
}

export function renderDayPreview({ index, name, display }) {
  const selectedDate = page.getSelectedDate();
  const selectedEmployee = page.getSelectedEmployee();
  const sheetData = storage.getSheetData(selectedDate) || {};
  const employeeData = sheetData[selectedEmployee];
  const employeeMeals = employeeData && employeeData[name];
  renderMeals(page.getMeals(display), employeeMeals, name);
  share.setWarningForDay(index, display);
}

function renderMeals(meals, employeeMeals, day) {
  const hasMeal = employeeMeals && employeeMeals.length > 0;
  meals.show(hasMeal);
  if (!hasMeal) {
    return;
  }

  meals.setNames(i => employeeMeals[i]);
  page.checkMeals(mealState.get(day), meals.display);
}

function getDefaultSelectId() {
  let currentDay = new Date().getDay();
  if (currentDay < 1 || currentDay > 5)
    currentDay = 1;
  return currentDay;
}

function getDefaultSelect(id = -1) {
  if (id === -1) {
    id = getDefaultSelectId();
  }
  return document.getElementById(id);
}
