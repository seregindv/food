import { Injectable } from '@angular/core';
import type * as XLSXTypes from 'xlsx';
import { DAY_NAMES, MEAL_ICONS } from './meal-data.service';

type XLSXModule = typeof import('xlsx');

export interface ParsedWorkbook {
  sheetData: Record<string, Record<string, (string | null)[]>>;
  sheetDate: Date | null;
  foodInfo: Record<string, any>;
}

@Injectable({ providedIn: 'root' })
export class WorkbookParserService {
  parseWorkbook(
    workbook: XLSXTypes.WorkBook & { fileName?: string | null },
    xlsx: XLSXModule,
    requireDate = true,
  ): ParsedWorkbook {
    return parseWorkbook(workbook, xlsx, requireDate);
  }

  getAvailableDays(sheetData: Record<string, Record<string, (string | null)[]>>): string[] {
    return DAY_NAMES.filter((dayName) =>
      Object.values(sheetData).some((employeeData) => employeeData[dayName]?.some((meal) => meal)),
    );
  }

  getFoodInfo(workbook: XLSXTypes.WorkBook, xlsx: XLSXModule): Record<string, any> {
    return getFoodInfo(workbook, xlsx);
  }

  mergeSheetDays(
    targetData: Record<string, Record<string, (string | null)[]>>,
    sourceData: Record<string, Record<string, (string | null)[]>>,
    dayNames: string[],
  ): void {
    for (const employeeData of Object.values(targetData)) {
      for (const dayName of dayNames) {
        delete employeeData[dayName];
      }
    }
    for (const [employee, employeeData] of Object.entries(sourceData)) {
      for (const dayName of dayNames) {
        if (employeeData[dayName]) {
          (targetData[employee] ||= {})[dayName] = employeeData[dayName];
        }
      }
    }
  }

  mergeFoodIntoDay(
    targetData: Record<string, Record<string, (string | null)[]>>,
    sourceData: Record<string, Record<string, (string | null)[]>>,
    dayName: string,
  ): void {
    for (const [employee, employeeData] of Object.entries(sourceData)) {
      const addedMeals = Object.values(employeeData).find((meals) => meals?.some((meal) => meal));
      if (!addedMeals) {
        continue;
      }
      const meals = ((targetData[employee] ||= {})[dayName] ||= []);
      while (meals.length < addedMeals.length) {
        meals.push(null);
      }
      addedMeals.forEach((meal, index) => {
        if (meal) {
          meals[index] = meal;
        }
      });
    }
  }
}

function parseWorkbook(
  workbook: XLSXTypes.WorkBook & { fileName?: string | null },
  xlsx: XLSXModule,
  requireDate = true,
): ParsedWorkbook {
  const sheetData: Record<string, Record<string, (string | null)[]>> = {};
  let sheetDate: Date | null = null;
  let i = 0;
  const fullDayNames = ['понедельник', 'вторник', 'среда', 'четверг', 'пятница'];
  const daySheets = DAY_NAMES.map((dayName, dayIndex) => ({
    dayName,
    dayIndex,
    sheetName: workbook.SheetNames.find((name) => {
      const normalizedName = name.trim().toLowerCase();
      return normalizedName === dayName || normalizedName === fullDayNames[dayIndex];
    }),
  })).filter(
    (sheet): sheet is { dayName: string; dayIndex: number; sheetName: string } => !!sheet.sheetName,
  );
  const useFirstDataSheet = daySheets.length === 0;
  const sheetsToParse: { dayName: string; dayIndex?: number; sheetName: string }[] =
    useFirstDataSheet
      ? workbook.SheetNames.map((sheetName) => ({ dayName: sheetName, sheetName }))
      : daySheets;

  for (const { dayName, dayIndex, sheetName } of sheetsToParse) {
    const worksheet = workbook.Sheets[sheetName];
    if (!sheetDate) {
      const date = worksheet['B1'] || worksheet['B2'];
      sheetDate = parseDate(date, xlsx, useFirstDataSheet ? i : (dayIndex ?? i));
    }

    const jsonData: any[][] = xlsx.utils.sheet_to_json(worksheet, {
      defval: null,
      range: 'A3:M100',
      header: 1,
      blankrows: false,
    });
    if (jsonData.length === 0) {
      ++i;
      continue;
    }

    const mealIndexes = new Array(MEAL_ICONS.length).fill(null);
    let mealTitleRow = 0;
    let employeeColumnIndex = 0;
    for (let row = 0; row < 2; row++) {
      const mealTitles = jsonData[row];
      for (let column = 0; column < mealTitles.length; column++) {
        const title = mealTitles[column]?.toLowerCase && mealTitles[column].toLowerCase();
        switch (title) {
          case 'участник':
          case 'сотрудник':
            employeeColumnIndex = column;
            break;
          case 'завтраки':
          case 'завтрак':
            mealIndexes[0] = column;
            mealTitleRow = row;
            break;
          case 'блюдо 1':
            mealIndexes[1] = column;
            mealTitleRow = row;
            break;
          case 'блюдо 2':
            mealIndexes[2] = column;
            mealTitleRow = row;
            break;
          case 'напиток':
          case 'напитки и десерты':
          case 'сок':
            mealIndexes[3] = column;
            mealTitleRow = row;
            break;
          case 'выпечка':
            mealIndexes[4] = column;
            mealTitleRow = row;
            break;
          case 'закуски':
            mealIndexes[5] = column;
            mealTitleRow = row;
            break;
          case 'супы':
          case 'суп':
            mealIndexes[6] = column;
            mealTitleRow = row;
            break;
          case 'сaлат': // First 'а' is Latin.
          case 'сaлаты и закуски':
          case 'салат':
            mealIndexes[7] = column;
            mealTitleRow = row;
            break;
          case 'горячие блюда':
          case 'бургер':
          case 'горячее':
          case 'горячее - обеды':
            mealIndexes[8] = column;
            mealTitleRow = row;
            break;
          case 'гарнир':
          case 'гарниры':
          case 'дополнительный гарнир по желанию':
            mealIndexes[9] = column;
            mealTitleRow = row;
            break;
          case 'десерт':
          case 'десерты':
          case 'выпечка - десерты':
            mealIndexes[10] = column;
            mealTitleRow = row;
            break;
          case 'соусы и топпинги':
            mealIndexes[11] = column;
            mealTitleRow = row;
            break;
          case 'сендвичи':
            mealIndexes[12] = column;
            mealTitleRow = row;
            break;
        }
      }
    }

    for (let rowIndex = mealTitleRow + 1; rowIndex < jsonData.length; rowIndex++) {
      const row = jsonData[rowIndex];
      let employeeName = row[employeeColumnIndex];
      if (
        employeeName == null ||
        !(employeeName = employeeName.toString().trim()) ||
        !employeeName.includes(' ')
      ) {
        continue;
      }
      const meals = new Array(MEAL_ICONS.length).fill(null);
      mealIndexes.forEach((index, mealIndex) => {
        if (index !== null) {
          meals[mealIndex] = row[index];
        }
      });
      let lastMealIndex = meals.length - 1;
      for (; lastMealIndex >= 0 && !meals[lastMealIndex]; lastMealIndex--) {}
      const mealsByDay = (sheetData[employeeName] ||= {});
      if (lastMealIndex >= 0) {
        mealsByDay[dayName] = meals.slice(0, lastMealIndex + 1);
      }
    }

    const sheetHasFood = Object.values(sheetData).some((employeeData) =>
      employeeData[dayName]?.some((meal) => meal),
    );
    if (useFirstDataSheet && sheetHasFood) {
      break;
    }
    ++i;
  }

  if (Object.keys(sheetData).length === 0) {
    throw new Error('Не удалось ничего прочитать');
  }
  if (requireDate) {
    if (!sheetDate) {
      sheetDate = parseDate(workbook.Sheets['WD']?.['H3'], xlsx);
    }
    if (!sheetDate) {
      sheetDate = parseFilenameDate(workbook['fileName']);
    }
    if (!sheetDate) {
      throw new Error('Не удалось найти дату');
    }
  }
  return { sheetData, sheetDate, foodInfo: getFoodInfo(workbook, xlsx) };
}

function getFoodInfo(workbook: XLSXTypes.WorkBook, xlsx: XLSXModule): Record<string, any> {
  const menuSheetName = workbook.SheetNames.find((name) => {
    name = name.toLowerCase();
    return name === 'menu' || name === 'меню' || name === 'состав + кбжу';
  });
  const sheetNames = menuSheetName
    ? [menuSheetName, ...workbook.SheetNames.filter((name) => name !== menuSheetName)]
    : workbook.SheetNames;
  for (const sheetName of sheetNames) {
    const foodInfo = parseFoodInfo(workbook.Sheets[sheetName], xlsx);
    if (Object.keys(foodInfo).length > 0) {
      return foodInfo;
    }
  }
  return {};
}

function parseFoodInfo(
  worksheet: XLSXTypes.WorkSheet | undefined,
  xlsx: XLSXModule,
): Record<string, any> {
  if (!worksheet) {
    return {};
  }
  const rows: any[][] = xlsx.utils.sheet_to_json(worksheet, {
    defval: null,
    range: 'A1:Z200',
    header: 1,
    blankrows: false,
  });
  if (rows.length === 0) {
    return {};
  }

  let nameIndex: { index: number; text: string | null };
  const headerRowIndex = rows.findIndex((row) => {
    nameIndex = findHeaderIndex(row, 'naziv', 'наименование', 'блюдо');
    return nameIndex.index !== -1;
  });
  if (headerRowIndex === -1) {
    return {};
  }
  const headers = rows[headerRowIndex];
  const indexes = {
    name: nameIndex!,
    weight: findHeaderIndex(headers, 'вес', 'гр/мл', 'выход', 'порция, г/мл'),
    infoRU: findHeaderIndex(headers, 'состав'),
    infoRS: findHeaderIndex(headers, 'sastojci'),
    nutrition: findHeaderIndex(headers, 'кбжу'),
    allergens: findHeaderIndex(headers, 'аллергены'),
    shelfLife: findHeaderIndex(headers, 'срок'),
    price: findHeaderIndex(headers, 'cena'),
    calories: findHeaderIndex(headers, 'ккал'),
    protein: findHeaderIndex(headers, 'белки'),
    fat: findHeaderIndex(headers, 'жиры'),
    carbs: findHeaderIndex(headers, 'углеводы'),
  };
  const vegetarianIndex = indexes.name.index > 0 ? indexes.name.index - 1 : -1;
  const priceIndex =
    indexes.price.index >= 0
      ? indexes.price.index
      : indexes.weight.index >= 0 && !headers[indexes.weight.index + 1]
        ? indexes.weight.index + 1
        : -1;
  const isTotalNutrition = !indexes.nutrition.text?.includes('100 г');
  const foodInfo: Record<string, any> = {};

  for (const row of rows.slice(headerRowIndex + 1)) {
    const name = row[indexes.name.index]?.toString().trim();
    const hasDetails = row.some((value, index) => index !== indexes.name.index && value != null);
    if (!name || !hasDetails) {
      continue;
    }
    const rawWeight = row[indexes.weight.index];
    let weight = rawWeight?.toString();
    if (weight && !weight.includes('г')) {
      weight += ' г';
    }
    const item: Record<string, any> = {
      weight,
      infoRU: row[indexes.infoRU.index],
      ...parseNutrition(row[indexes.nutrition.index], rawWeight, isTotalNutrition),
      allergens: row[indexes.allergens.index],
    };
    if (indexes.nutrition.index === -1) {
      for (const key of ['calories', 'protein', 'fat', 'carbs']) {
        const value = parseNumber(row[(indexes as Record<string, { index: number }>)[key].index]);
        if (value != null) {
          item[key] = value;
        }
      }
    }
    if (priceIndex >= 0) {
      item['price'] = parseNumber(row[priceIndex]);
    }
    if (indexes.shelfLife.index >= 0) {
      item['shelfLife'] = row[indexes.shelfLife.index];
    }
    if (indexes.infoRS.index >= 0) {
      item['infoRS'] = row[indexes.infoRS.index];
    }
    if (vegetarianIndex >= 0 && row[vegetarianIndex]?.toString().toLowerCase().includes('вегета')) {
      item['vegeterian'] = true;
    }
    foodInfo[name] = item;
  }
  return foodInfo;
}

function findHeaderIndex(
  headers: any[],
  ...expectedTexts: string[]
): { index: number; text: string | null } {
  for (let index = 0; index < headers.length; index++) {
    const headerText = headers[index]?.toString().toLowerCase();
    if (expectedTexts.some((expectedText) => headerText?.includes(expectedText))) {
      return { index, text: headerText };
    }
  }
  return { index: -1, text: null };
}

function parseNutrition(value: any, weight: any, isTotal: boolean): Record<string, number> {
  const text = value?.toString();
  const numericWeight = parseNumber(weight);
  if (!text || (!isTotal && numericWeight == null)) {
    return {};
  }
  const result: Record<string, number> = {};
  add('calories', /(?<!\p{L})[КK]\p{L}*\s*<?\s*(\d+(?:[.,]\d+)?)/iu, 1);
  add('protein', /(?<!\p{L})Б\p{L}*\s*<?\s*(\d+(?:[.,]\d+)?)/iu, 10);
  add('fat', /(?<!\p{L})Ж\p{L}*\s*<?\s*(\d+(?:[.,]\d+)?)/iu, 10);
  add('carbs', /(?<!\p{L})У\p{L}*\s*<?\s*(\d+(?:[.,]\d+)?)/iu, 10);
  return result;

  function add(key: string, pattern: RegExp, round: number): void {
    const match = text.match(pattern);
    const nutrition = match ? Number(match[1].replace(',', '.')) : null;
    if (nutrition === null) {
      return;
    }
    result[key] = isTotal ? nutrition : roundNutrition((nutrition * numericWeight!) / 100, round);
  }
}

function parseNumber(value: any): number | null {
  if (typeof value === 'number') {
    return value;
  }
  const match = value?.toString().match(/\d+(?:[.,]\d+)?/);
  return match ? Number(match[0].replace(',', '.')) : null;
}

function roundNutrition(value: number, round: number): number {
  return Math.round((value + Number.EPSILON) * round) / round;
}

function parseDate(
  cell: XLSXTypes.CellObject | undefined,
  xlsx: XLSXModule,
  dateOffset = 0,
): Date | null {
  const value = cell?.v;
  if (!value || typeof value !== 'number') {
    return null;
  }
  const date = xlsx.SSF.parse_date_code(value);
  if (!date) {
    return null;
  }
  return new Date(date.y, date.m - 1, date.d - dateOffset);
}

function parseFilenameDate(filename?: string | null): Date | null {
  const match = filename?.match(/(?:^|\D)(\d{1,2})\.(\d{1,2})(?!\d)/);
  if (!match) {
    return null;
  }
  const day = Number(match[1]);
  const month = Number(match[2]);
  const date = new Date(new Date().getFullYear(), month - 1, day);
  return date.getDate() === day && date.getMonth() === month - 1 ? date : null;
}
