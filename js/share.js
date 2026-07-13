import * as page from './page.js';
import * as storage from './storage.js';
import { getDateString, mealIcons } from './common.js';

export function setWarningForDay(dayIndex, display) {
  page.setShareWarning(isWarningDay(dayIndex), display);
}

export async function copyEatIt() {
  const data = getData();
  await navigator.clipboard.writeText(data.text);
  page.disableCopyEatIt();
}

export async function shareEatIt() {
  const data = getData();
  await navigator.share(data);
}

function getData() {
  const selectedEmployee = page.getSelectedEmployee();
  if (!selectedEmployee) {
    return;
  }

  const selectedDate = page.getSelectedDate();
  let selectedDay = page.getSelectedDay().name;
  if (!selectedDay) {
    return;
  }

  const sheetData = storage.getSheetData(selectedDate) || {};
  const employeeData = sheetData[selectedEmployee];
  if (!employeeData) {
    return;
  }

  const employeeMeals = employeeData[selectedDay];
  if (!employeeMeals) {
    return;
  }

  const eatenAll = storage.getEatean(selectedDate) || {};
  const employeeEaten = eatenAll[selectedEmployee] || {};
  const eaten = employeeEaten[selectedDay] || [];

  let text = "Привет! Съешьте пожалуйста мою еду";
  for (let i = 0; i < employeeMeals.length; i++) {
    const meal = employeeMeals[i];
    if (meal && !eaten.includes(i)) {
      text += `\n\n${mealIcons[i]} ${meal}`;
    }
  }

  return { title: `Еда за ${selectedDay.toLowerCase()}`, text };
}

function isWarningDay(dayIndex) {
  const selectedDate = page.getSelectedDate();
  const dayDate = getDayDate(selectedDate, dayIndex);
  return !dayDate || getDateString(dayDate) !== getDateString(new Date());
}

function getDayDate(mondayDateString, dayIndex) {
  if (!mondayDateString || dayIndex === undefined || dayIndex === null || dayIndex < 0) {
    return null;
  }

  const [year, month, day] = mondayDateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + dayIndex);
  return date;
}
