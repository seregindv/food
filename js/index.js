import * as page from './page.js';
import * as storage from './storage.js';
import { mealIcons } from './common.js';
import * as refresh from './refresh.js';
import * as mascot from './mascot.js';
import * as sheet from './sheet.js';
import * as mealView from './meal-view.js';
import * as mealState from './meal-state.js';
import * as share from './share.js';

async function onDownloadSheet(sheetLink) {
  if (!sheetLink) {
    page.displayError("Пожалуйста, введите ссылку");
    return;
  }
  const sheetId = sheet.extractId(sheetLink);
  if (!sheetId) {
    page.displayError("Неверная ссылка на Google-таблицу");
    return;
  }

  try {
    page.showLoading(true);
    page.clearDisplays(false);
    const sheetDate = await sheet.download(sheetId, false);
    page.renderLoadedSheets(storage.getSheets());
    page.setDates(storage.getSheetDates());
    page.selectDate(sheetDate);
    page.canCloseSettings(true);
  } catch (error) {
    console.error(error);
    page.displayError(error.message);
  } finally {
    page.showLoading(false);
  }
}

async function onAddSheet(sheetLink) {
  const selectedDate = page.getSelectedDate();
  if (!selectedDate) {
    page.displayError("Сначала выберите неделю");
    return;
  }
  if (!sheetLink) {
    page.displayError("Пожалуйста, введите ссылку");
    return;
  }
  const sheetId = sheet.extractId(sheetLink);
  if (!sheetId) {
    page.displayError("Неверная ссылка на Google-таблицу");
    return;
  }

  try {
    page.displayError("");
    page.showLoading(true);
    const sheetUrl = sheet.getSheetUrl(sheetId);
    const { sheetData } = await sheet.downloadData(sheetUrl, false);
    page.showLoading(false);
    const availableDays = sheet.getAvailableDays(sheetData);
    if (availableDays.length === 0) {
      throw new Error("Не удалось найти дни с едой");
    }
    const selectedDays = await page.chooseDays(availableDays);
    if (!selectedDays || selectedDays.length === 0) {
      return;
    }

    sheet.addSheetDays(selectedDate, sheetUrl, sheetData, selectedDays);
    page.renderLoadedSheets(storage.getSheets());
    onDateChanged(selectedDate);
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
  page.renderLoadedSheets(storage.getSheets());
  page.selectDefaultDate();
}

function onDateChanged(date) {
  const data = date && storage.getSheetData(date);
  if (!data) {
    page.clearDisplays(false);
    page.showSelectors(false);
    page.showSettings(true, false);
    return;
  }
  try {
    const today = getToday();
    page.setToday(today);

    mealView.populateEmployeeSelect(data);
    mealView.selectDefaultDay();
    mealView.displaySelectedData();
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

function setupEventListeners() {
  page.setupMealIcons(mealIcons);
  page.setupDropdownButtons();
  page.onUpload(sheetLink => onDownloadSheet(sheetLink));
  page.onAddSheet(sheetLink => onAddSheet(sheetLink));
  page.onDeleteSheet(date => deleteSheet(date));

  page.onEmployeeChanged(employee => {
    if (employee) {
      localStorage.setItem("selectedEmployee", employee);
    } else {
      localStorage.removeItem("selectedEmployee");
    }
    mealView.displaySelectedData();
  });

  page.onDayChanged(() => mealView.displaySelectedData(true));
  page.setupDaySwipe({ onPreview: mealView.renderDayPreview, onSlideStart: ({ index }) => share.setWarningForDay(index) });
  page.onMealCheckChanged(({ index, checked }) => mealState.update(index, checked));
  page.setupSettingsActions();
  refresh.init({ onStart: onRefreshStart, onAction: onRefresh, onMoving: page.onRefreshMove, threshold: 210 });
  page.onCopyEatIt({ action: share.copyEatIt });
  page.onShareEatIt({ action: share.shareEatIt });
  mascot.init();
}

function deleteSheet(date) {
  const selectedDate = page.getSelectedDate();
  storage.deleteSheet(date);
  const dates = storage.getSheetDates();
  page.setDates(dates);
  page.renderLoadedSheets(storage.getSheets());
  if (selectedDate && dates?.includes(selectedDate)) {
    page.selectDate(selectedDate);
  } else {
    page.selectDefaultDate();
  }
}

async function onRefresh() {
  try {
    page.ensureRefreshLoader();
    page.showRefreshLoading();
    const date = page.getSelectedDate();
    if (await sheet.refresh(date)) {
      page.renderLoadedSheets(storage.getSheets());
      onDateChanged(date);
    }
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

page.onLoaded(() => {
  setupEventListeners();
  loadMapFromLocalStorage();
});
