let SHEET_ID = null;
const SHEETS = ["Пн", "Вт", "Ср", "Чт", "Пт"];

function toggleLoader(show) {
  const loader = document.getElementById("loader");
  loader.style.display = show ? "block" : "none";
}

function displayError(message) {
  const errorDisplay = document.getElementById("errorDisplay");
  errorDisplay.textContent = message;
}

function clearDisplays() {
  document.querySelector(".values-list").classList.toggle("hidden", true);
  document.getElementById("noData").classList.toggle("hidden", true);
  document.getElementById("errorDisplay").textContent = "";
}

function displaySheetTitle(sheetInfo) {
  const sheetTitleElement = document.getElementById("sheetTitle");
  document.querySelector(".sheet-title").classList.toggle("hidden", !sheetInfo);
  if (!sheetInfo) {
    sheetTitleElement.textContent = '';
    return;
  }

  const sheetDate = sheetInfo.date;
  const formattedDate = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short' }).format(new Date(sheetDate));
  sheetTitleElement.textContent = `Таблица от ${formattedDate}`;

  const today = new Date();
  let monday = getMonday(today);
  let nextMonday = new Date(monday);
  nextMonday = new Date(nextMonday.setDate(nextMonday.getDate() + 7));
  monday = getDateString(monday);
  nextMonday = getDateString(nextMonday);
  const late = 'late', early = 'early', normal = 'normal';
  const status = sheetDate < monday ? late
    : sheetDate >= nextMonday ? early : normal;

  const sheetStatusElement = document.getElementById("sheetStatus")
  sheetStatusElement.classList.remove(late, early, normal)
  sheetStatusElement.classList.add(status);

  const day = today.getDay() - 1;
  document.querySelectorAll('input[name="day"]').forEach(
    (e, i) => e.classList.toggle('today', status === normal && i == day));
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
    toggleLoader(true);
    clearDisplays();
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
    document.getElementById("selectContainer").style.display = "block";
  } catch (error) {
    console.error(error);
    displayError(error.message);
  } finally {
    toggleLoader(false);
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
      document.getElementById("selectContainer").style.display = "block";
    } catch (error) {
      console.error(error);
      displayError("Ошибка при загрузке данных из localStorage");
    }
  } else {
    document.getElementById("selectContainer").style.display = "none";
  }
}

function extractSheetId(url) {
  const regex = /\/d\/([a-zA-Z0-9-_]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

function populateEmployeeSelect(data) {
  const employeeSelect = document.getElementById("employeeSelect");
  employeeSelect.innerHTML = '<option value="">Выберите сотрудника</option>';
  const employees = Object.keys(data).sort();
  employees.forEach((employee) => {
    const option = document.createElement("option");
    option.value = employee;
    option.textContent = employee;
    employeeSelect.appendChild(option);
  });
  const savedEmployee = localStorage.getItem("selectedEmployee");
  if (savedEmployee && employees.includes(savedEmployee)) {
    employeeSelect.value = savedEmployee;
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
  const employeeSelect = document.getElementById("employeeSelect");
  const display = document.getElementById("jsonDisplay");
  const status = document.getElementById("noData");
  const dataMap = JSON.parse(
    localStorage.getItem("googleSheetDataMap") || "{}"
  );
  const selectedEmployee = employeeSelect.value;
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
      for (const i in radios) {
        const radio = radios[i];
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
    displayError("Пожалуйста, введите ссылку");
    return;
  }
  const sheetId = extractSheetId(sheetLink);
  if (!sheetId) {
    displayError("Неверная ссылка на Google Таблицу.");
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
  // console.log(e);
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
