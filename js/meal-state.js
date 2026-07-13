import * as page from './page.js';
import * as storage from './storage.js';

export function get(day) {
  const date = page.getSelectedDate();
  if (!date) {
    return;
  }

  const employee = page.getSelectedEmployee();
  if (!employee) {
    return;
  }

  const eaten = storage.getEatean(date);
  const employeeData = eaten && eaten[employee];
  return employeeData && employeeData[day];
}

export function update(index, checked) {
  const date = page.getSelectedDate();
  if (!date) {
    return;
  }

  const employee = page.getSelectedEmployee();
  if (!employee) {
    return;
  }

  const day = page.getSelectedDay().name;
  if (!day) {
    return;
  }

  const eaten = storage.getEatean(date) || {};

  let employeeData = eaten[employee];
  if (!employeeData) {
    eaten[employee] = employeeData = {};
  }

  let dayData = employeeData[day];
  if (!dayData) {
    employeeData[day] = dayData = [];
  }

  const mealIndex = dayData.indexOf(index);
  if (checked) {
    if (mealIndex === -1) {
      dayData.push(index)
    }
  } else {
    if (mealIndex !== -1) {
      dayData.splice(mealIndex, 1);
    }
  }
  storage.setEaten(date, eaten);
}
