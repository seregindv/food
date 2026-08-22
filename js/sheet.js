import * as storage from './storage.js';
import { getDateString, getDownloadSheetUrl, getMonday, mealIcons, dayNames } from './common.js';

export async function download(sheetId, refreshing) {
  const sheetUrl = getSheetUrl(sheetId);
  const { sheetData, sheetDate, foodInfo } = await downloadData(sheetUrl);

  if (!refreshing) {
    const monday = getMonday();
    storage.dropOldSheets(getDateString(monday));
  }

  const sheetDateString = getDateString(sheetDate);
  storage.setSheetData(sheetDateString, sheetData, refreshing ? null : sheetUrl);
  storage.setFoodInfo(sheetDateString, foodInfo);
  return sheetDateString;
}

export async function downloadData(sheetUrl, requireDate = true) {
  const downloadUrl = getDownloadSheetUrl(sheetUrl);
  const response = await fetch(downloadUrl, {
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
  return parseWorkbook(workbook, requireDate);
}

export function getAvailableDays(sheetData) {
  return dayNames.filter(dayName =>
    Object.values(sheetData).some(employeeData => employeeData[dayName]?.some(meal => meal)));
}

export function addSheetDays(date, sheetUrl, sheetData, selectedDays) {
  const currentData = storage.getSheetData(date) || {};
  mergeSheetDays(currentData, sheetData, selectedDays);
  storage.setSheetData(date, currentData);
  storage.setAddedSheetLink(date, sheetUrl, selectedDays);
  storage.clearEatenDays(date, selectedDays);
}

export function addFoodToDay(date, sheetUrl, sheetData, dayName) {
  const currentData = storage.getSheetData(date) || {};
  mergeFoodIntoDay(currentData, sheetData, dayName);
  storage.setSheetData(date, currentData);
  storage.setAddedFoodLink(date, sheetUrl, dayName);
  storage.clearEatenDays(date, [dayName]);
}

export async function refresh(date) {
  const links = storage.getSheetLinks(date);
  if (!date || !links.main) {
    return false;
  }

  const { sheetData, foodInfo } = await downloadData(links.main);
  const additions = Object.entries(links).filter(([days]) => days !== "main");
  for (const [days, link] of additions.filter(([days]) => !days.startsWith("+"))) {
    const { sheetData: addedData } = await downloadData(link, false);
    mergeSheetDays(sheetData, addedData, days.split("-"));
  }
  for (const [day, link] of additions.filter(([days]) => days.startsWith("+"))) {
    const { sheetData: addedData } = await downloadData(link, false);
    mergeFoodIntoDay(sheetData, addedData, day.slice(1));
  }

  storage.setSheetData(date, sheetData);
  storage.setFoodInfo(date, foodInfo);
  return true;
}

export function extractId(url) {
  const regex = /\/d\/([a-zA-Z0-9-_]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

export function getSheetUrl(sheetId) {
  return `https://docs.google.com/spreadsheets/d/${sheetId}`;
}

function parseWorkbook(workbook, requireDate = true) {
  const sheetData = {};
  let sheetDate;
  let i = 0;
  const daySheets = dayNames.map(dayName => ({
    dayName,
    sheetName: workbook.SheetNames.find(name => name.toLowerCase() === dayName)
  })).filter(sheet => sheet.sheetName);
  const useFirstDataSheet = daySheets.length === 0;
  const sheetsToParse = useFirstDataSheet
    ? workbook.SheetNames.map(sheetName => ({ dayName: sheetName, sheetName }))
    : daySheets;
  for (const { dayName, sheetName } of sheetsToParse) {
    const worksheet = workbook.Sheets[sheetName];
    if (!sheetDate) {
      sheetDate = parseDate(worksheet["B1"], i);
    }

    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      defval: null,
      range: "B3:M100",
      header: 1,
      blankrows: false,
    });
    if (jsonData.length === 0) {
      ++i;
      continue;
    }

    const mealIndexes = new Array(mealIcons.length).fill(null);
    let mealTitleRow = 0;
    for (let i = 0; i < 2; i++) {
      const mealTitles = jsonData[i];
      for (let j = 1; j < mealTitles.length; j++) {
        const title = mealTitles[j]?.toLowerCase && mealTitles[j].toLowerCase();
        switch (title) {
          case "завтраки":
          case "завтрак": mealIndexes[0] = j; mealTitleRow = i; break;
          case "напиток":
          case "напитки и десерты":
          case "сок": mealIndexes[1] = j; mealTitleRow = i; break;
          case "выпечка": mealIndexes[2] = j; mealTitleRow = i; break;
          case "закуски": mealIndexes[3] = j; mealTitleRow = i; break;
          case "супы":
          case "суп": mealIndexes[4] = j; mealTitleRow = i; break;
          case "сaлат": // 1st а latin
          case "сaлаты и закуски":
          case "салат": mealIndexes[5] = j; mealTitleRow = i; break;
          case "горячие блюда":
          case "бургер":
          case "горячее": mealIndexes[6] = j; mealTitleRow = i; break;
          case "гарнир":
          case "гарниры": mealIndexes[7] = j; mealTitleRow = i; break;
          case "десерт":
          case "десерты": mealIndexes[8] = j; mealTitleRow = i; break;
          case "соусы и топпинги": mealIndexes[9] = j; mealTitleRow = i; break;
          case "сендвичи": mealIndexes[10] = j; mealTitleRow = i; break;
        }
      }
    }
    for (let i = mealTitleRow + 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      let employeeName = row[0];
      if (employeeName == null || !(employeeName = employeeName.toString().trim()) || !employeeName.includes(" ")) {
        continue;
      }
      const meals = new Array(mealIcons.length).fill(null);
      mealIndexes.forEach((index, i) => { if (index !== null) meals[i] = row[index] });
      let j = meals.length - 1;
      for (; j >= 0 && !meals[j]; j--);
      const mealsByDay = (sheetData[employeeName] ||= {});
      if (j >= 0) {
        mealsByDay[dayName] = meals.slice(0, j + 1);
      }
    }
    const sheetHasFood = Object.values(sheetData).some(employeeData =>
      employeeData[dayName]?.some(meal => meal));
    if (useFirstDataSheet && sheetHasFood) {
      break;
    }
    ++i;
  }
  if (Object.keys(sheetData).length === 0) {
    throw new Error("Не удалось ничего прочитать");
  }
  if (requireDate && !sheetDate) {
    sheetDate = parseDate(workbook.Sheets["WD"]?.["H3"]);
  }
  if (requireDate && !sheetDate) {
    throw new Error("Не удалось найти дату");
  }

  return { sheetData, sheetDate, foodInfo: parseFoodInfo(workbook.Sheets["Menu"]) };
}

export function parseFoodInfo(worksheet) {
  if (!worksheet) {
    return {};
  }

  const rows = XLSX.utils.sheet_to_json(worksheet, {
    defval: null,
    range: "A1:I100",
    header: 1,
    blankrows: false,
  });
  if (rows.length === 0) {
    return {};
  }

  let nameIndex;
  const headerRowIndex = rows.findIndex(row => {
    nameIndex = findHeaderIndex(row, "naziv", "наименование");
    return nameIndex !== -1;
  });
  if (headerRowIndex === -1) {
    return {};
  }
  const headers = rows[headerRowIndex];
  const indexes = {
    name: nameIndex,
    weight: findHeaderIndex(headers, "вес", "гр/мл"),
    infoRU: findHeaderIndex(headers, "состав"),
    infoRS: findHeaderIndex(headers, "sastojci"),
    nutrition: findHeaderIndex(headers, "кбжу"),
    allergens: findHeaderIndex(headers, "аллергены"),
  };
  const vegetarianIndex = indexes.name > 0 ? indexes.name - 1 : -1;
  const priceIndex = indexes.weight >= 0 ? indexes.weight + 1 : -1;

  const foodInfo = {};
  for (const row of rows.slice(headerRowIndex + 1)) {
    const name = row[indexes.name]?.toString().trim();
    const hasDetails = row.some((value, index) =>
      index !== indexes.name && value != null);
    if (!name || !hasDetails) {
      continue;
    }

    const weight = parseNumber(row[indexes.weight]);
    const item = {
      weight,
      price: parseNumber(row[priceIndex]),
      infoRU: row[indexes.infoRU]?.toString().trim(),
      infoRS: row[indexes.infoRS]?.toString().trim(),
      ...parseNutrition(row[indexes.nutrition], weight),
      allergens: row[indexes.allergens]?.toString().trim(),
    };
    if (vegetarianIndex >= 0 && row[vegetarianIndex]) {
      item.vegeterian = true;
    }
    foodInfo[name] = item;
  }
  return foodInfo;
}

function findHeaderIndex(headers, ...expectedTexts) {
  return headers.findIndex(header =>
    expectedTexts.some(expectedText =>
      header?.toString().toLowerCase().includes(expectedText)));
}

function parseNutrition(value, weight) {
  const text = value?.toString();
  if (!text || weight === null) {
    return { calories: null, protein: null, fat: null, carbs: null };
  }

  const patterns = {
    calories: /[КK]\s*<?\s*(\d+(?:[.,]\d+)?)/i,
    protein: /Б\s*<?\s*(\d+(?:[.,]\d+)?)/i,
    fat: /Ж\s*<?\s*(\d+(?:[.,]\d+)?)/i,
    carbs: /У\s*<?\s*(\d+(?:[.,]\d+)?)/i,
  };
  return Object.fromEntries(Object.entries(patterns).map(([key, pattern]) => {
    const match = text.match(pattern);
    const perHundredGrams = match ? Number(match[1].replace(",", ".")) : null;
    return [key, perHundredGrams === null ? null : roundNutrition(perHundredGrams * weight / 100)];
  }));
}

function parseNumber(value) {
  if (typeof value === "number") {
    return value;
  }
  const match = value?.toString().match(/\d+(?:[.,]\d+)?/);
  return match ? Number(match[0].replace(",", ".")) : null;
}

function roundNutrition(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function parseDate(cell, dateOffset = 0) {
  const value = cell?.v;
  if (!value) {
    return null;
  }
  const date = XLSX.SSF.parse_date_code(value);
  return new Date(date.y, date.m - 1, date.d - dateOffset);
}

function mergeSheetDays(targetData, sourceData, dayNames) {
  for (const employeeData of Object.values(targetData)) {
    dayNames.forEach(dayName => delete employeeData[dayName]);
  }
  for (const [employee, employeeData] of Object.entries(sourceData)) {
    for (const dayName of dayNames) {
      if (employeeData[dayName]) {
        (targetData[employee] ||= {})[dayName] = employeeData[dayName];
      }
    }
  }
}

function mergeFoodIntoDay(targetData, sourceData, dayName) {
  for (const [employee, employeeData] of Object.entries(sourceData)) {
    const addedMeals = Object.values(employeeData).find(meals => meals?.some(meal => meal));
    if (!addedMeals) {
      continue;
    }
    const meals = (targetData[employee] ||= {})[dayName] ||= [];
    while (meals.length < addedMeals.length) {
      meals.push(null);
    }
    addedMeals.forEach((meal, index) => {
      if (!meal) {
        return;
      }
      meals[index] = meal;
    });
  }
}
