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
  const workbook = await downloadWorkbook(sheetUrl);
  return parseWorkbook(workbook, requireDate);
}

export async function downloadWorkbook(sheetUrl) {
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
  const disposition = response.headers.get("Content-Disposition");
  const filename = disposition?.match(/(?:^|;)\s*filename\s*=\s*(?:"([^"]*)"|([^;]*))/i);
  workbook.fileName = filename ? (filename[1] ?? filename[2]).trim() : null;
  return workbook;
}

export async function addFoodInfo(date, sheetUrl) {
  const infoImported = await downloadFoodInfo(sheetUrl);
  const currentInfo = storage.getFoodInfo(date) || {};
  Object.assign(currentInfo, infoImported);
  storage.setFoodInfo(date, currentInfo);
  storage.addMenuLink(date, sheetUrl);
}

async function downloadFoodInfo(sheetUrl) {
  const workbook = await downloadWorkbook(sheetUrl);
  const foodInfo = getFoodInfo(workbook);
  if (foodInfo) {
    return foodInfo;
  }
  throw new Error("Не удалось найти меню");
}

export function getFoodInfo(workbook) {
  const menuSheetName = workbook.SheetNames.find(name => {
    name = name.toLowerCase();
    return name === "menu" || name === "меню" || name === "состав + кбжу";
  });
  const sheetNames = menuSheetName
    ? [menuSheetName, ...workbook.SheetNames.filter(name => name !== menuSheetName)]
    : workbook.SheetNames;
  for (const sheetName of sheetNames) {
    const foodInfo = parseFoodInfo(workbook.Sheets[sheetName]);
    if (Object.keys(foodInfo).length > 0) {
      return foodInfo;
    }
  }
  return null;
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
  for (const addition of links.days) {
    const { sheetData: addedData } = await downloadData(addition.link, false);
    if (addition.mode === "add") {
      mergeFoodIntoDay(sheetData, addedData, addition.days[0]);
    } else {
      mergeSheetDays(sheetData, addedData, addition.days);
    }
  }
  for (const menuLink of links.menu) {
    Object.assign(foodInfo, await downloadFoodInfo(menuLink));
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
  const fullDayNames = ["понедельник", "вторник", "среда", "четверг", "пятница"];
  const daySheets = dayNames.map((dayName, dayIndex) => ({
    dayName,
    dayIndex,
    sheetName: workbook.SheetNames.find(name => {
      const normalizedName = name.trim().toLowerCase();
      return normalizedName === dayName || normalizedName === fullDayNames[dayIndex];
    })
  })).filter(sheet => sheet.sheetName);
  const useFirstDataSheet = daySheets.length === 0;
  const sheetsToParse = useFirstDataSheet
    ? workbook.SheetNames.map(sheetName => ({ dayName: sheetName, sheetName }))
    : daySheets;
  for (const { dayName, dayIndex, sheetName } of sheetsToParse) {
    const worksheet = workbook.Sheets[sheetName];
    if (!sheetDate) {
      sheetDate = parseDate(worksheet["B1"], useFirstDataSheet ? i : dayIndex);
    }

    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      defval: null,
      range: "A3:M100",
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
          case "блюдо 1": mealIndexes[1] = j; mealTitleRow = i; break;
          case "блюдо 2": mealIndexes[2] = j; mealTitleRow = i; break;
          case "напиток":
          case "напитки и десерты":
          case "сок": mealIndexes[3] = j; mealTitleRow = i; break;
          case "выпечка": mealIndexes[4] = j; mealTitleRow = i; break;
          case "закуски": mealIndexes[5] = j; mealTitleRow = i; break;
          case "супы":
          case "суп": mealIndexes[6] = j; mealTitleRow = i; break;
          case "сaлат": // 1st а latin
          case "сaлаты и закуски":
          case "салат": mealIndexes[7] = j; mealTitleRow = i; break;
          case "горячие блюда":
          case "бургер":
          case "горячее":
          case "горячее - обеды": mealIndexes[8] = j; mealTitleRow = i; break;
          case "гарнир":
          case "гарниры":
          case "дополнительный гарнир по желанию": mealIndexes[9] = j; mealTitleRow = i; break;
          case "десерт":
          case "десерты":
          case "выпечка - десерты": mealIndexes[10] = j; mealTitleRow = i; break;
          case "соусы и топпинги": mealIndexes[11] = j; mealTitleRow = i; break;
          case "сендвичи": mealIndexes[12] = j; mealTitleRow = i; break;
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

  if (requireDate) {
    if (!sheetDate) {
      sheetDate = parseDate(workbook.Sheets["WD"]?.["H3"]);
    }
    if (!sheetDate) {
      sheetDate = parseFilenameDate(workbook.fileName);
    }
    if (!sheetDate) {
      throw new Error("Не удалось найти дату");
    }
  }

  return { sheetData, sheetDate, foodInfo: getFoodInfo(workbook) };
}

export function parseFoodInfo(worksheet) {
  if (!worksheet) {
    return {};
  }

  const rows = XLSX.utils.sheet_to_json(worksheet, {
    defval: null,
    range: "A1:Z200",
    header: 1,
    blankrows: false,
  });
  if (rows.length === 0) {
    return {};
  }

  let nameIndex;
  const headerRowIndex = rows.findIndex(row => {
    nameIndex = findHeaderIndex(row, "naziv", "наименование", "блюдо");
    return nameIndex.index !== -1;
  });
  if (headerRowIndex === -1) {
    return {};
  }
  const headers = rows[headerRowIndex];
  const indexes = {
    name: nameIndex,
    weight: findHeaderIndex(headers, "вес", "гр/мл", "выход", "порция, г/мл"),
    infoRU: findHeaderIndex(headers, "состав"),
    infoRS: findHeaderIndex(headers, "sastojci"),
    nutrition: findHeaderIndex(headers, "кбжу"),
    allergens: findHeaderIndex(headers, "аллергены"),
    shelfLife: findHeaderIndex(headers, "срок"),
    price: findHeaderIndex(headers, "cena"),
    calories: findHeaderIndex(headers, "ккал"),
    protein: findHeaderIndex(headers, "белки"),
    fat: findHeaderIndex(headers, "жиры"),
    carbs: findHeaderIndex(headers, "углеводы"),
    onion: findHeaderIndex(headers, "лук")
  };
  const vegetarianIndex = indexes.name.index > 0 ? indexes.name.index - 1 : -1;
  const priceIndex = indexes.price.index >= 0 ? indexes.price.index
    : indexes.weight.index >= 0 && !headers[indexes.weight.index + 1] ? indexes.weight.index + 1 : -1;
  const isTotalNutrition = !indexes.nutrition.text?.includes("100 г");

  const foodInfo = {};
  for (const row of rows.slice(headerRowIndex + 1)) {
    const name = row[indexes.name.index]?.toString().trim();
    const hasDetails = row.some((value, index) =>
      index !== indexes.name.index && value != null);
    if (!name || !hasDetails) {
      continue;
    }

    const rawWeight = row[indexes.weight.index];
    let weight = rawWeight?.toString();
    if (weight && !weight.includes("г")) {
      weight += " г";
    }
    const item = {
      weight,
      infoRU: row[indexes.infoRU.index],
      ...parseNutrition(row[indexes.nutrition.index], rawWeight, isTotalNutrition),
      allergens: row[indexes.allergens.index]
    };
    if (indexes.nutrition.index === -1) {
      for (const key of ["calories", "protein", "fat", "carbs"]) {
        const value = parseNumber(row[indexes[key].index]);
        if (value != null) {
          item[key] = value;
        }
      }
    }
    if (priceIndex >= 0) {
      item.price = parseNumber(row[priceIndex]);
    }
    if (indexes.shelfLife.index >= 0) {
      item.shelfLife = row[indexes.shelfLife.index];
    }
    if (indexes.infoRS.index >= 0) {
      item.infoRS = row[indexes.infoRS.index];
    }

    if (vegetarianIndex >= 0 && row[vegetarianIndex]?.toString().toLowerCase().includes("вегета")) {
      item.vegeterian = true;
    }
    foodInfo[name] = item;
  }
  return foodInfo;
}

function findHeaderIndex(headers, ...expectedTexts) {
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    const headerText = header?.toString().toLowerCase();
    if (expectedTexts.some(expectedText => headerText?.includes(expectedText))) {
      return { index: i, text: headerText };
    }
  }
  return { index: -1, text: null };
}

function parseNutrition(value, weight, isTotal) {
  const text = value?.toString();
  const numericWeight = parseNumber(weight);
  if (!text || (!isTotal && numericWeight == null)) {
    return {};
  }

  const result = {};
  add(result, "calories", /(?<!\p{L})[КK]\p{L}*\s*<?\s*(\d+(?:[.,]\d+)?)/iu, 1);
  add(result, "protein", /(?<!\p{L})Б\p{L}*\s*<?\s*(\d+(?:[.,]\d+)?)/iu, 10);
  add(result, "fat", /(?<!\p{L})Ж\p{L}*\s*<?\s*(\d+(?:[.,]\d+)?)/iu, 10);
  add(result, "carbs", /(?<!\p{L})У\p{L}*\s*<?\s*(\d+(?:[.,]\d+)?)/iu, 10);

  return result;

  function add(result, key, pattern, round) {
    const match = text.match(pattern);
    const nutrition = match ? Number(match[1].replace(",", ".")) : null;
    if (nutrition === null) {
      return;
    }
    result[key] = isTotal ? nutrition : roundNutrition(nutrition * numericWeight / 100, round);
  }
}

function parseNumber(value) {
  if (typeof value === "number") {
    return value;
  }
  const match = value?.toString().match(/\d+(?:[.,]\d+)?/);
  return match ? Number(match[0].replace(",", ".")) : null;
}

function roundNutrition(value, round) {
  return Math.round((value + Number.EPSILON) * round) / round;
}

function parseDate(cell, dateOffset = 0) {
  const value = cell?.v;
  if (!value) {
    return null;
  }
  const date = XLSX.SSF.parse_date_code(value);
  if (!date) {
    return null;
  }
  return new Date(date.y, date.m - 1, date.d - dateOffset);
}

function parseFilenameDate(filename) {
  const match = filename?.match(/(?:^|\D)(\d{1,2})\.(\d{1,2})(?!\d)/);
  if (!match) {
    return null;
  }
  const day = Number(match[1]);
  const month = Number(match[2]);
  const date = new Date(new Date().getFullYear(), month - 1, day);
  return date.getDate() === day && date.getMonth() === month - 1 ? date : null;
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
