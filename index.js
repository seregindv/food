import * as page from './page.js';

let SHEET_ID = null;
const SHEETS = ["Пн", "Вт", "Ср", "Чт", "Пт"];

function displaySheetTitle(sheetInfo) {
  page.showTitle(sheetInfo);
  if (!sheetInfo) {
    page.setTitle('');
    return;
  }

  const sheetDate = sheetInfo.date;
  const formattedDate = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short' }).format(new Date(sheetDate));
  page.setTitle(`Таблица от ${formattedDate}`);

  const today = new Date();
  let monday = getMonday(today);
  let nextMonday = new Date(monday);
  nextMonday = new Date(nextMonday.setDate(nextMonday.getDate() + 7));
  monday = getDateString(monday);
  nextMonday = getDateString(nextMonday);

  const status = sheetDate < monday ? page.sheetStatus.late
    : sheetDate >= nextMonday ? page.sheetStatus.early : page.sheetStatus.normal;
  page.setSheetStatus(status);

  const day = today.getDay() - 1;
  page.setToday(i => status === page.sheetStatus.normal && i == day);
}

function getMonday(date) {
  date = new Date(date);
  const day = date.getDay(),
    diff = date.getDate() - day + (day == 0 ? -6 : 1);
  return new Date(date.setDate(diff));
}

async function downloadAndStoreGoogleSheets(
  sheetId,
  sheetNames,
  range = "B4:M100"
) {
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
    for (const sheetName of sheetNames) {
      if (!workbook.SheetNames.includes(sheetName)) {
        continue;
      }
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        defval: null,
        range: range,
        header: 1,
        blankrows: false,
      });
      if (jsonData.length === 0) {
        continue;
      }
      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        const employeeName = row[0];
        if (
          employeeName === undefined ||
          employeeName === null ||
          employeeName.toString().trim() === ""
        ) {
          continue;
        }
        if (!masterData.hasOwnProperty(employeeName)) {
          masterData[employeeName] = {};
        }
        const valuesArray = row
          .slice(1)
          .filter(
            (value) =>
              value !== null &&
              value !== undefined &&
              value.toString().trim() !== ""
          );
        masterData[employeeName][sheetName] = valuesArray;
      }
    }
    if (Object.keys(masterData).length === 0) {
      throw new Error("Не удалось создать объект из данных.");
    }
    localStorage.setItem("googleSheetDataMap", JSON.stringify(masterData));
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

    const sheetInfo = createSheetInfo(sheetDate);
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
  const mapData = localStorage.getItem("googleSheetDataMap");
  if (mapData) {
    try {
      const dataObject = JSON.parse(mapData);
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
  const employeeSelect = document.getElementById("employeeSelect");
  const selectedEmployee = employeeSelect.value;

  const status = document.getElementById("noData");
  const dataMap = JSON.parse(
    localStorage.getItem("googleSheetDataMap") || "{}"
  );
  const checkedDay = document.querySelector('input[name="day"]:checked');
  let selectedDay = checkedDay && checkedDay.value;
  if (!selectedDay) {
    const defaultSelect = getDefaultSelect();
    selectedDay = defaultSelect.value;
    defaultSelect.checked = true;
  }

  if (selectedEmployee) {
    const employeeData = dataMap[selectedEmployee];
    if (!mealOnly) {
      const radios = document.querySelectorAll('input[name="day"]');
      let uncheckedIndex;
      let i = 0;
      for (const radio of radios) {
        const radioData = employeeData && employeeData[radio.value];
        const disabled = !radioData || !radioData[0];
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
    if (employeeData && employeeData[selectedDay]) {
      const meals = employeeData[selectedDay];
      const hasMeal = !!meals[0];
      const display = document.getElementById("jsonDisplay");
      display.querySelector(".values-list").classList.toggle("hidden", !hasMeal);
      status.classList.toggle("hidden", hasMeal);
      if (hasMeal) {
        let i = 0;
        for (const listItem of display.querySelectorAll(".meal-name")) {
          const meal = meals[i];
          listItem.innerText = meal || null;
          const wrapper = listItem.closest(".meal");
          wrapper.classList.toggle("hidden", !meal);
          ++i;
        }
        applyMealState();
      } else {
        status.innerText = "Нет данных";
      }
    } else {
      status.innerHTML = "Нет данных для выбранных опций";
    }
  } else {
    status.innerHTML = "Пожалуйста, выберите сотрудника и день недели";
  }
}

document.getElementById("uploadBtn").addEventListener("click", () => {
  const sheetLink = document.getElementById("sheetLinkInput").value.trim();
  if (!sheetLink) {
    page.displayError("Пожалуйста, введите ссылку");
    return;
  }
  const sheetId = extractSheetId(sheetLink);
  if (!sheetId) {
    page.displayError("Неверная ссылка на Google Таблицу.");
    return;
  }
  SHEET_ID = sheetId;
  localStorage.setItem("originalSheetLink", sheetLink);
  downloadAndStoreGoogleSheets(SHEET_ID, SHEETS, "B5:M50");
});

function setupEventListeners() {
  const employeeSelect = document.getElementById("employeeSelect");
  employeeSelect.addEventListener("change", () => {
    const selectedEmployee = employeeSelect.value;
    if (selectedEmployee) {
      localStorage.setItem("selectedEmployee", selectedEmployee);
    } else {
      localStorage.removeItem("selectedEmployee");
    }
    displaySelectedData();
  });

  const days = document.querySelectorAll('input[name="day"]');
  days.forEach(e => e.addEventListener("change", () => {
    displaySelectedData(true);
  }));

  document.querySelectorAll('input[name="meal"]').forEach(e => e.addEventListener("change", e => updateMealState(e)));
}

function createSheetInfo(sheetDate) {
  return { date: getDateString(sheetDate) };
}

function getDateString(date) {
  return date.toLocaleDateString('en-CA');
}

function applyMealState() {
  const employeeSelect = document.getElementById('employeeSelect')
  const employee = employeeSelect && employeeSelect.value;
  if (!employee) {
    return;
  }

  const checkedDay = document.querySelector('input[name="day"]:checked');
  const day = checkedDay && checkedDay.value;
  if (!day) {
    return;
  }

  const eaten = JSON.parse(localStorage.getItem('eaten'));
  let days;
  if (eaten) {
    const employeeData = eaten[employee];
    if (employeeData) {
      days = employeeData[day];
    }
  }

  days = new Set(days);
  document.querySelectorAll('input[name="meal"]').forEach((e, i) => e.checked = days.has(i));
}

function updateMealState(e) {
  let id = /(\d+)$/.exec(e.target.id);
  if (!id) {
    return;
  }
  id = id[1] - 1;

  const employeeSelect = document.getElementById('employeeSelect')
  const employee = employeeSelect && employeeSelect.value;
  if (!employee) {
    return;
  }

  const checkedDay = document.querySelector('input[name="day"]:checked');
  const day = checkedDay && checkedDay.value;
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

  const mealIndex = dayData.indexOf(id);
  if (e.target.checked) {
    if (mealIndex === -1) {
      dayData.push(id)
    }
  } else {
    if (mealIndex !== -1) {
      dayData.splice(mealIndex, 1);
    }
  }
  localStorage.setItem("eaten", JSON.stringify(eaten));
}

window.addEventListener("DOMContentLoaded", () => {
  loadMapFromLocalStorage();
  setupEventListeners();

  let sheetInfo = JSON.parse(localStorage.getItem("sheetInfo"));
  let sheetTitle;
  if (!sheetInfo) {
    sheetTitle = localStorage.getItem("sheetTitle")
    if (sheetTitle) {
      const dateCompoments = /(\d+)\.(\d+)\.(\d+)$/.exec(sheetTitle);
      if (dateCompoments) {
        sheetInfo = createSheetInfo(new Date(dateCompoments[3], dateCompoments[2] - 1, dateCompoments[1]));
        localStorage.setItem("sheetInfo", JSON.stringify(sheetInfo));
        localStorage.removeItem("sheetTitle")
      }
    }
  }
  displaySheetTitle(sheetInfo);
});
