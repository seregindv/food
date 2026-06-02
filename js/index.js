import * as page from './page.js';
import * as storage from './storage.js';
import { getDateString, getMonday, mealIcons } from './common.js';
import * as refresh from './refresh.js';
import * as mascot from './mascot.js';

async function onDownloadSheet(sheetLink) {
  if (!sheetLink) {
    page.displayError("Пожалуйста, введите ссылку");
    return;
  }
  const sheetId = extractSheetId(sheetLink);
  if (!sheetId) {
    page.displayError("Неверная ссылка на Google-таблицу");
    return;
  }

  const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;

  page.showLoading(true);
  const success = await downloadSheet(exportUrl, false);
  if (success) {
    page.canCloseSettings(true);
  }
  page.showLoading(false);
}

async function downloadSheet(url, refreshing) {
  try {
    page.clearDisplays(refresh);
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
    if (!response.ok) {
      throw new Error(`Ошибка загрузки таблицы: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const sheetData = {};
    let sheetDate;
    let i = 0;
    for (const sheetName of ["Пн", "Вт", "Ср", "Чт", "Пт"]) {
      if (!workbook.SheetNames.includes(sheetName)) {
        continue;
      }

      const worksheet = workbook.Sheets[sheetName];
      if (!sheetDate) {
        sheetDate = parseDate(worksheet["B1"], i);
      }

      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        defval: null,
        range: "B4:M100",
        header: 1,
        blankrows: false,
      });
      if (jsonData.length === 0) {
        continue;
      }

      const mealIndexes = new Array(mealIcons.length).fill(null);
      const mealTitles = jsonData[0];
      for (let j = 1; j < mealTitles.length; j++) {
        const title = mealTitles[j]?.toLowerCase();
        switch (title) {
          case "завтрак": mealIndexes[0] = j; break;
          case "напиток":
          case "сок": mealIndexes[1] = j; break;
          case "суп": mealIndexes[2] = j; break;
          case "сaлат": // 1st а latin
          case "салат": mealIndexes[3] = j; break;
          case "горячее": mealIndexes[4] = j; break;
          case "гарниры": mealIndexes[5] = j; break;
          case "десерт":
          case "десерты": mealIndexes[6] = j; break;
          case "соусы и топпинги": mealIndexes[7] = j; break;
        }
      }
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        let employeeName = row[0];
        if (employeeName == null || !(employeeName = employeeName.toString().trim()) || !employeeName.includes(" ")) {
          continue;
        }
        let mealsByDay = sheetData[employeeName];
        if (!mealsByDay) {
          sheetData[employeeName] = mealsByDay = {};
        }
        const meals = new Array(7).fill(null);
        mealIndexes.forEach((index, i) => { if (index !== null) meals[i] = row[index] });
        let j = meals.length - 1;
        for (; j >= 0 && !meals[j]; j--);
        if (j > 0) {
          mealsByDay[sheetName] = meals.slice(0, j + 1);
        }
      }
      ++i;
    }
    if (Object.keys(sheetData).length === 0) {
      throw new Error("Не удалось ничего прочитать");
    }
    if (!sheetDate) {
      sheetDate = parseDate(workbook.Sheets["WD"]?.["H3"]);
    }
    if (!sheetDate) {
      throw new Error("Не удалось найти дату");
    }

    if (!refreshing) {
      const monday = getMonday();
      storage.dropOldSheets(getDateString(monday));
    }

    const sheetDateString = getDateString(sheetDate);
    storage.setSheetData(sheetDateString, sheetData, url);
    const dates = storage.getSheetDates();
    if (!refreshing) {
      page.setDates(dates);
    }
    page.selectDate(sheetDateString);
    return true;
  } catch (error) {
    console.error(error);
    page.displayError(error.message);
    return false;
  }
}

function parseDate(cell, dateOffset = 0) {
  const value = cell?.v;
  if (!value) {
    return null;
  }
  const date = XLSX.SSF.parse_date_code(value);
  return new Date(date.y, date.m - 1, date.d - dateOffset);
}

function loadMapFromLocalStorage() {
  const sheetDates = storage.getSheetDates();
  page.initDates(sheetDates, date => onDateChanged(date));
  page.selectDefaultDate();
}

function onDateChanged(date) {
  const data = date && storage.getSheetData(date);
  if (!data) {
    page.showSelectors(false);
    page.showSettings(true, false);
    return;
  }
  try {
    const today = getToday();
    page.setToday(today);

    populateEmployeeSelect(data);
    setDefaultDaySelect();
    displaySelectedData();
    page.showSelectors(true);
  } catch (error) {
    console.error(error);
    page.displayError("Ошибка при загрузке данных из localStorage");
  }
}

function getToday() {
  const status = page.getSelectedDateStatus();
  return status === "normal" ? new Date().getDay() - 1 : -1;
}

function extractSheetId(url) {
  const regex = /\/d\/([a-zA-Z0-9-_]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

function populateEmployeeSelect(data) {
  const employees = Object.keys(data).map(employee => ({ name: employee, hasMeal: !!Object.keys(data[employee])[0] })).sort();
  const selectedEmployee = localStorage.getItem("selectedEmployee");
  page.populateEmployees(employees, selectedEmployee);
  if (!data) {
    page.showSettings(true, false);
  }
}

function setDefaultDaySelect() {
  const currentDay = getDefaultSelect();
  currentDay.checked = true;
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

function displaySelectedData(mealOnly) {
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
    const today = getToday();
    page.setShareWarning(today !== selectedDayIndex);
    const employeeMeals = employeeData[selectedDayName];
    renderMeals(meals, employeeMeals, selectedDayName);
  } else {
    meals.show(false);
    page.setStatus("Нет еды для сотрудника");
  }
}

function renderMeals(meals, employeeMeals, day) {
  const hasMeal = employeeMeals && employeeMeals.length > 0;
  meals.show(hasMeal);
  if (!hasMeal) {
    return;
  }

  meals.setNames(i => employeeMeals[i]);
  page.checkMeals(getMealState(day), meals.display);
}

function renderDayPreview({ name, display }) {
  const selectedDate = page.getSelectedDate();
  const selectedEmployee = page.getSelectedEmployee();
  const sheetData = storage.getSheetData(selectedDate) || {};
  const employeeData = sheetData[selectedEmployee];
  const employeeMeals = employeeData && employeeData[name];
  renderMeals(page.getMeals(display), employeeMeals, name);
}

function setupEventListeners() {
  page.setupMealIcons(mealIcons);
  page.onUpload(sheetLink => onDownloadSheet(sheetLink));

  page.onEmployeeChanged(employee => {
    if (employee) {
      localStorage.setItem("selectedEmployee", employee);
    } else {
      localStorage.removeItem("selectedEmployee");
    }
    displaySelectedData();
  });

  page.onDayChanged(() => displaySelectedData(true));
  page.setupDaySwipe({ onPreview: renderDayPreview });
  page.onMealCheckChanged(({ index, checked }) => updateMealState(index, checked));
  page.setupSettingsActions();
  refresh.init({ onStart: onRefreshStart, onAction: onRefresh, onMoving: page.onRefreshMove, threshold: 210 });
  page.onCopyEatIt({ action: copyEatIt });
  page.onShareEatIt({ action: shareEatIt });
  mascot.init();
}

function getMealState(day) {
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

function updateMealState(index, checked) {
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

async function onRefresh() {
  try {
    page.ensureRefreshLoader();
    page.showRefreshLoading();
    const date = page.getSelectedDate();
    const link = storage.getLink(date);
    await downloadSheet(link, true);
  } finally {
    page.showRefreshArrow();
  }
}

function onRefreshStart(e) {
  const date = page.getSelectedDate();
  e.cancel = !date;
  if (date) {
    page.updateRefreshStatus();
  }
}

function getShareData() {
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

async function copyEatIt() {
  const data = getShareData();
  await navigator.clipboard.writeText(data.text);
  page.disableCopyEatIt();
}

async function shareEatIt() {
  const data = getShareData();
  await navigator.share(data);
}

page.onLoaded(() => {
  setupEventListeners();
  loadMapFromLocalStorage();
});
