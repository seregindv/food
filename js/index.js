import * as page from './page.js';
import * as storage from './storage.js';
import { getDateString } from './common.js';

function displaySheetTitle(sheetInfo) {
  page.showTitle(sheetInfo);
  if (!sheetInfo) {
    page.setTitle('');
    return;
  }

  const today = new Date();
  const day = today.getDay() - 1;

  // TODO status
  page.setToday(i => status === page.sheetStatus.normal && i == day);
}

async function downloadSheet(sheetLink) {
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
  try {
    page.showLoading(true);
    page.clearDisplays();
    const response = await fetch(exportUrl, {
      method: "GET",
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
    if (!response.ok) {
      throw new Error(`Ошибка загрузки таблицы: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const masterData = {};
    for (const sheetName of ["Пн", "Вт", "Ср", "Чт", "Пт"]) {
      if (!workbook.SheetNames.includes(sheetName)) {
        continue;
      }
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        defval: null,
        range: "B4:M100",
        header: 1,
        blankrows: false,
      });
      if (jsonData.length === 0) {
        continue;
      }
      const mealIndexes = jsonData[0].reduce((res, curr, i) => { if (curr) res.push(i); return res; }, []);
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        let employeeName = row[0];
        if (employeeName == null || !(employeeName = employeeName.toString().trim()) || !employeeName.includes(" ")) {
          continue;
        }
        let mealsByDay = masterData[employeeName];
        if (!mealsByDay) {
          masterData[employeeName] = mealsByDay = {};
        }
        const meals = new Array(7).fill(null);
        mealIndexes.forEach((index, i) => meals[i] = row[index]);
        let j = meals.length - 1;
        for (; j >= 0 && !meals[j]; j--);
        if (j > 0) {
          mealsByDay[sheetName] = meals.slice(0, j + 1);
        }
      }
    }
    if (Object.keys(masterData).length === 0) {
      throw new Error("Не удалось создать объект из данных");
    }
    localStorage.setItem("sheetData", JSON.stringify(masterData));
    console.log(workbook);
    let sheetDate;
    if (workbook.SheetNames.includes("Пн")) {
      const worksheet = workbook.Sheets["Пн"];
      const cellAddress = "B1";
      const cell = worksheet[cellAddress];
      if (cell && cell.v) {
        const date = XLSX.SSF.parse_date_code(cell.v);
        sheetDate = new Date(date.y, date.m - 1, date.d);
      }
    }

    const sheetDateString = getDateString(sheetDate);
    const sheetInfo = { dates: sheetDateString };
    localStorage.setItem("sheetInfo", JSON.stringify(sheetInfo));
    localStorage.removeItem("eaten");
    displaySheetTitle(sheetInfo);
    populateEmployeeSelect(masterData);
    setDefaultDaySelect();
    displaySelectedData();
    page.showSelectors(true);
  } catch (error) {
    console.error(error);
    page.displayError(error.message);
  } finally {
    page.showLoading(false);
  }
}

function loadMapFromLocalStorage() {
  const sheetInfo = storage.getInfo();
  page.initDates(sheetInfo.dates, sheet => onSheetChanged(sheet));
  page.selectDefaultDate();
  if (sheetInfo) {
    try {
      populateEmployeeSelect(dataObject);
      setDefaultDaySelect();
      displaySelectedData();
      page.showSelectors(true);
    } catch (error) {
      console.error(error);
      page.displayError("Ошибка при загрузке данных из localStorage");
    }
  } else {
    page.showSelectors(false);
  }

  displaySheetTitle(sheetInfo);
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

  const sheetData = JSON.parse(localStorage.getItem("sheetData")) || {};
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
  page.onUpload(sheetLink => downloadSheet(sheetLink));

  page.onEmployeeChanged(employee => {
    if (employee) {
      localStorage.setItem("selectedEmployee", employee);
    } else {
      localStorage.removeItem("selectedEmployee");
    }
    displaySelectedData();
  });

  page.onDayChanged(() => displaySelectedData(true));
  page.onMealCheckChanged(({ index, checked }) => updateMealState(index, checked));
}

function applyMealState() {
  const employee = page.getSelectedEmployee();
  if (!employee) {
    return;
  }

  const day = page.getSelectedDay();
  if (!day) {
    return;
  }

  const eaten = JSON.parse(localStorage.getItem('eaten'));
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
  const employee = page.getSelectedEmployee();
  if (!employee) {
    return;
  }

  const day = page.getSelectedDay();
  if (!day) {
    return;
  }

  let eaten = localStorage.getItem('eaten');
  if (!eaten) {
    eaten = {};
  } else {
    eaten = JSON.parse(eaten);
  }

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
  localStorage.setItem("eaten", JSON.stringify(eaten));
}

page.onLoaded(() => {
  loadMapFromLocalStorage();
  setupEventListeners();
});
