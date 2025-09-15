import * as page from './page.js';
import * as storage from './storage.js';
import { getDateString, getMonday, mealIcons } from './common.js';
import * as refresh from './refresh.js';

function onDownloadSheet(sheetLink) {
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
  downloadSheet(exportUrl, false);
}

async function downloadSheet(url, refreshing) {
  try {
    page.showLoading(true);
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
        const cell = worksheet["B1"];
        if (cell?.v) {
          const date = XLSX.SSF.parse_date_code(cell.v);
          sheetDate = new Date(date.y, date.m - 1, date.d - i);
        }
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
      let mealIndexes = jsonData[0].reduce((res, curr, i) => { if (curr) res.push(i); return res; }, []);
      if (mealIndexes.length < 7) { // when one of meal titles deleted
        mealIndexes = [1, 3, 4, 6, 8, 10, 11];
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
        mealIndexes.forEach((index, i) => meals[i] = row[index]);
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
  } catch (error) {
    console.error(error);
    page.displayError(error.message);
  } finally {
    page.showLoading(false);
  }
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
    const status = page.getSelectedDateStatus();
    const day = status === 'normal' ? new Date().getDay() - 1 : -1;
    page.setToday(day);

    populateEmployeeSelect(data);
    setDefaultDaySelect();
    displaySelectedData();
    page.showSelectors(true);
  } catch (error) {
    console.error(error);
    page.displayError("Ошибка при загрузке данных из localStorage");
  }
}

function extractSheetId(url) {
  const regex = /\/d\/([a-zA-Z0-9-_]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

function populateEmployeeSelect(data) {
  const employees = Object.keys(data).sort();
  const selectedEmployee = localStorage.getItem("selectedEmployee");
  page.populateEmployees(employees, selectedEmployee);
  if (!selectedEmployee) {
    page.showSettings(true, false);
  }
}

function setDefaultDaySelect() {
  const currentDay = getDefaultSelect();
  currentDay.checked = true;
}

function getDefaultSelect() {
  let currentDay = new Date().getDay();
  if (currentDay < 1 || currentDay > 5)
    currentDay = 1;
  return document.getElementById(currentDay);
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
  let selectedDay = page.getSelectedDay();
  if (!selectedDay) {
    const defaultSelect = getDefaultSelect();
    selectedDay = defaultSelect.value;
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
        selectedDay = radio.value;
      }
      if (disabled && radio.checked) {
        radio.checked = false;
        selectedDay = undefined;
        uncheckedIndex = i;
      }
      ++i;
    }
    if (uncheckedIndex !== undefined) {
      for (let i = uncheckedIndex; i >= 0; i--) {
        const radio = radios[i];
        if (!radio.disabled) {
          radio.checked = true;
          selectedDay = radio.value;
          break;
        }
      }
    }
  }
  if (employeeData) {
    const employeeMeals = employeeData[selectedDay];
    const hasMeal = employeeMeals && employeeMeals.length > 0;
    meals.show(hasMeal);
    if (hasMeal) {
      meals.setNames(i => employeeMeals[i]);
      applyMealState();
    }
  } else {
    meals.show(false);
    page.setStatus("Нет еды для сотрудника");
  }
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
    page.setEmployeeName(employee);
    page.canCloseSettings(!!employee);
    displaySelectedData();
  });

  page.onDayChanged(() => displaySelectedData(true));
  page.onMealCheckChanged(({ index, checked }) => updateMealState(index, checked));
  page.setupSettingsActions();
  refresh.init({ onStart: onRefreshStart, onAction: onRefresh, onMoving: page.onRefreshMove, threshold: 210 });
  page.onCopyEatIt({ action: copyEatIt});
}

function applyMealState() {
  const date = page.getSelectedDate();
  if (!date) {
    return;
  }

  const employee = page.getSelectedEmployee();
  if (!employee) {
    return;
  }

  const day = page.getSelectedDay();
  if (!day) {
    return;
  }

  const eaten = storage.getEatean(date);
  let meals;
  if (eaten) {
    const employeeData = eaten[employee];
    if (employeeData) {
      meals = employeeData[day];
    }
  }

  page.checkMeals(meals);
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

  const day = page.getSelectedDay();
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
  const date = page.getSelectedDate();
  const link = storage.getLink(date);
  await downloadSheet(link, true);
}

function onRefreshStart(e) {
  const date = page.getSelectedDate();
  e.cancel = !date;
  if (date) {
    page.updateRefreshStatus();
  }
}

async function copyEatIt() {
  const selectedEmployee = page.getSelectedEmployee();
  if (!selectedEmployee) {
    return;
  }

  const selectedDate = page.getSelectedDate();
  const sheetData = storage.getSheetData(selectedDate) || {};
  let selectedDay = page.getSelectedDay();
  if (!selectedDay) {
    return;
  }

  const employeeData = sheetData[selectedEmployee];
  if (!employeeData) {
    return;
  }
  
  const employeeMeals = employeeData[selectedDay];
  if (!employeeMeals) {
    return;
  } 

  let text = "Привет! Съешьте пожалуйста мою еду";
  for (let i = 0; i < employeeMeals.length; i++) {
    const meal = employeeMeals[i];
    if (meal) {
      text += `\n\n${mealIcons[i]} ${meal}`;
    }
  }

  await navigator.clipboard.writeText(text);
  page.disableCopyEatIt();
}

page.onLoaded(() => {
  loadMapFromLocalStorage();
  setupEventListeners();
});
