import * as storage from './storage.js';
import { getDateString, getDownloadSheetUrl, getMonday, mealIcons } from './common.js';

export const dayNames = ["пн", "вт", "ср", "чт", "пт"];

export async function download(sheetId, refreshing) {
  const sheetUrl = getSheetUrl(sheetId);
  const { sheetData, sheetDate } = await downloadData(sheetUrl);

  if (!refreshing) {
    const monday = getMonday();
    storage.dropOldSheets(getDateString(monday));
  }

  const sheetDateString = getDateString(sheetDate);
  storage.setSheetData(sheetDateString, sheetData, refreshing ? null : sheetUrl);
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

export async function refresh(date) {
  const links = storage.getSheetLinks(date);
  if (!date || !links.main) {
    return false;
  }

  const { sheetData } = await downloadData(links.main);
  for (const [days, link] of Object.entries(links)) {
    if (days === "main") {
      continue;
    }
    const { sheetData: addedData } = await downloadData(link, false);
    mergeSheetDays(sheetData, addedData, days.split("-"));
  }

  storage.setSheetData(date, sheetData);
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
    for (const dayName of dayNames) {
      const sheetName = workbook.SheetNames.find(name => name.toLowerCase() == dayName);
      if (!sheetName) {
        continue;
      }

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
        continue;
      }

      const mealIndexes = new Array(mealIcons.length).fill(null);
      let mealTitleRow = 0;
      for (let i = 0; i < 2; i++) {
        const mealTitles = jsonData[i];
        for (let j = 1; j < mealTitles.length; j++) {
          const title = mealTitles[j]?.toLowerCase && mealTitles[j].toLowerCase();
          switch (title) {
            case "завтрак": mealIndexes[0] = j; mealTitleRow = i; break;
            case "напиток":
            case "сок": mealIndexes[1] = j; mealTitleRow = i; break;
            case "суп": mealIndexes[2] = j; mealTitleRow = i; break;
            case "сaлат": // 1st а latin
            case "салат": mealIndexes[3] = j; mealTitleRow = i; break;
            case "горячее": mealIndexes[4] = j; mealTitleRow = i; break;
            case "гарнир":
            case "гарниры": mealIndexes[5] = j; mealTitleRow = i; break;
            case "десерт":
            case "десерты": mealIndexes[6] = j; mealTitleRow = i; break;
            case "соусы и топпинги": mealIndexes[7] = j; mealTitleRow = i; break;
            case "сендвичи": mealIndexes[8] = j; mealTitleRow = i; break;
          }
        }
      }
      for (let i = mealTitleRow + 1; i < jsonData.length; i++) {
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
          mealsByDay[dayName] = meals.slice(0, j + 1);
        }
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

    return { sheetData, sheetDate };
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
