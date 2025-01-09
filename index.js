let SHEET_ID = null;
const SHEETS = ["Пн", "Вт", "Ср", "Чт", "Пт"];

function createSnowflake() {
  const snowflake = document.createElement("div");
  snowflake.innerText = "❄";
  snowflake.style.position = "fixed";
  snowflake.style.top = "-50px";
  snowflake.style.left = `${Math.random() * 95}vw`;
  snowflake.style.fontSize = `${Math.random() * 20 + 10}px`;
  snowflake.style.color = "#64C7FF";
  snowflake.style.pointerEvents = "none";
  snowflake.style.zIndex = "9999";

  document.body.appendChild(snowflake);

  // Анимация падения снежинки
  const duration = Math.random() * 10 + 5; // 3-8 секунд падения
  const animation = snowflake.animate(
    [
      { transform: `translateY(0px) rotate(0deg)`, opacity: 1 },
      {
        transform: `translateY(${window.innerHeight + 100}px) rotate(360deg)`,
        opacity: 0,
      },
    ],
    {
      duration: duration * 1000,
      easing: "linear",
    }
  );

  // Удаляем снежинку после завершения анимации
  animation.onfinish = () => snowflake.remove();
}

function toggleLoader(show) {
  const loader = document.getElementById("loader");
  loader.style.display = show ? "block" : "none";
}

function displayError(message) {
  const errorDisplay = document.getElementById("errorDisplay");
  errorDisplay.textContent = message;
}

function clearDisplays() {
  document.getElementById("jsonDisplay").innerHTML = "";
  document.getElementById("errorDisplay").textContent = "";
}

function displayData(data) {
  const display = document.getElementById("jsonDisplay");
  display.innerHTML = "";
  if (Object.keys(data).length === 0) {
    display.textContent = "Нет данных для отображения.";
    return;
  }
  for (const [employee, daysData] of Object.entries(data)) {
    const employeeCard = document.createElement("div");
    employeeCard.className = "employee-card";
    const employeeHeader = document.createElement("div");
    employeeHeader.className = "employee-header";
    employeeHeader.textContent = employee;
    employeeCard.appendChild(employeeHeader);
    for (const [day, valuesArray] of Object.entries(daysData)) {
      const dayCard = document.createElement("div");
      dayCard.className = "day-card";
      const dayHeader = document.createElement("div");
      dayHeader.className = "day-header";
      dayHeader.textContent = day;
      dayCard.appendChild(dayHeader);
      if (valuesArray.length > 0) {
        const valuesList = document.createElement("ul");
        valuesList.className = "values-list";
        valuesArray.forEach((value) => {
          const listItem = document.createElement("li");
          listItem.textContent = value;
          valuesList.appendChild(listItem);
        });
        dayCard.appendChild(valuesList);
      } else {
        const noData = document.createElement("div");
        noData.textContent = "Нет данных.";
        dayCard.appendChild(noData);
      }
      employeeCard.appendChild(dayCard);
    }
    display.appendChild(employeeCard);
  }
}

function displaySheetTitle(sheetInfo, title) {
  const sheetTitleElement = document.getElementById("sheetTitle");
  if (!sheetInfo) {
    sheetTitleElement.textContent = title || 'Название таблицы';
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
      displayError("Ошибка при загрузке данных из localStorage.");
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
  const currentDay = new Date().getDay();
  if (currentDay < 1 || currentDay > 5)
    currentDay = 1;
  return document.getElementById(currentDay);
}

function displaySelectedData(mealOnly) {
  const employeeSelect = document.getElementById("employeeSelect");
  const display = document.getElementById("jsonDisplay");
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
  const compareButton = document.getElementById("compareButton");
  const originalLink = localStorage.getItem("originalSheetLink");

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
      const valuesArray = employeeData[selectedDay];
      display.innerHTML = "";
      const employeeCard = document.createElement("div");
      employeeCard.className = "employee-card";
      const dayCard = document.createElement("div");
      dayCard.className = "day-card";
      if (valuesArray.length > 0) {
        const valuesList = document.createElement("ul");
        valuesList.className = "values-list";
        valuesArray.forEach((value) => {
          const listItem = document.createElement("li");
          listItem.textContent = value;
          valuesList.appendChild(listItem);
        });
        dayCard.appendChild(valuesList);
      } else {
        const noData = document.createElement("div");
        noData.textContent = "Нет данных.";
        dayCard.appendChild(noData);
      }
      employeeCard.appendChild(dayCard);
      display.appendChild(employeeCard);

      if (originalLink) {
        compareButton.href = originalLink;
        compareButton.style.display = "inline-block";
      } else {
        compareButton.style.display = "none";
      }
    } else {
      display.innerHTML = "Нет данных для выбранных опций.";
      compareButton.style.display = "none";
    }
  } else {
    display.innerHTML = "Пожалуйста, выберите сотрудника и день недели.";
    compareButton.style.display = "none";
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

function setupSelectEventListeners() {
  const employeeSelect = document.getElementById("employeeSelect");
  const days = document.querySelectorAll('input[name="day"]');
  employeeSelect.addEventListener("change", () => {
    const selectedEmployee = employeeSelect.value;
    if (selectedEmployee) {
      localStorage.setItem("selectedEmployee", selectedEmployee);
    } else {
      localStorage.removeItem("selectedEmployee");
    }
    displaySelectedData();
  });
  days.forEach(e => e.addEventListener("change", () => {
    displaySelectedData(true);
  }));
}

function initializeSelects() {
  setupSelectEventListeners();
}

function initializeToggleSnowflakes() {
  const STORAGE_KEY = "snowflakes";
  const toggleButton = document.getElementById("toggleSnowflakes");
  let snowingInterval;

  // Инициализация состояния по умолчанию
  const isSnowing = () => JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? true;

  function startSnowfall() {
    snowingInterval = setInterval(createSnowflake, 1000);
  }

  function stopSnowfall() {
    clearInterval(snowingInterval);
  }

  function updateButtonIcon() {
    toggleButton.innerHTML = isSnowing() ? "❄️ 🚫" : "❄️";
  }

  function toggleSnowflakes() {
    const currentValue = JSON.parse(localStorage.getItem(STORAGE_KEY));
    localStorage.setItem(STORAGE_KEY, !currentValue);
    const snowing = !currentValue;
    snowing ? startSnowfall() : stopSnowfall();
    updateButtonIcon();
  }

  if (isSnowing()) startSnowfall();
  updateButtonIcon();

  toggleButton.addEventListener("click", toggleSnowflakes);
}

function createSheetInfo(sheetDate) {
  return { date: getDateString(sheetDate) };
}

function getDateString(date) {
  return date.toLocaleDateString('en-CA');
}

window.addEventListener("DOMContentLoaded", () => {
  loadMapFromLocalStorage();
  initializeSelects();
  initializeToggleSnowflakes();

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
  displaySheetTitle(sheetInfo, sheetTitle);
});
