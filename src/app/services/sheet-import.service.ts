import { Injectable } from '@angular/core';
import type * as XLSXTypes from 'xlsx';
import { DAY_NAMES, MealDataService } from './meal-data.service';
import { StorageService } from './storage.service';
import { ParsedWorkbook, WorkbookParserService } from './workbook-parser.service';

type XLSXWorkbook = XLSXTypes.WorkBook & { fileName?: string | null };

@Injectable({ providedIn: 'root' })
export class SheetImportService {
  private pendingImport: { sheetData: ParsedWorkbook['sheetData']; sheetDate: Date | null; foodInfo: Record<string, any>; sheetUrl: string } | null = null;
  private pendingAddition: { sheetUrl: string; sheetData: ParsedWorkbook['sheetData'] } | null =
    null;
  constructor(
    private meals: MealDataService,
    private storage: StorageService,
    private parser: WorkbookParserService,
  ) {}

  async import(link: string): Promise<string | null> {
    if (!link.trim()) throw new Error('Пожалуйста, введите ссылку');
    const sheetId = this.extractId(link.trim());
    if (!sheetId) {
      throw new Error('Неверная ссылка на Google-таблицу');
    }
    const sheetUrl = this.getSheetUrl(sheetId);
    const parsed = await this.downloadData(sheetUrl, false);
    if (!parsed.sheetDate) {
      this.pendingImport = { ...parsed, sheetUrl };
      return null;
    }
    const date = this.saveImport(parsed, sheetUrl);
    this.meals.reload();
    this.meals.selectWeek(date);
    return date;
  }

  completeImport(date: string): void {
    if (!this.pendingImport) return;
    const parsed = this.pendingImport;
    this.pendingImport = null;
    const selectedDate = new Date(`${date}T00:00:00`);
    const weekday = selectedDate.getDay();
    selectedDate.setDate(selectedDate.getDate() - weekday + (weekday === 0 ? -6 : 1));
    parsed.sheetDate = selectedDate;
    const week = this.saveImport(parsed, parsed.sheetUrl);
    this.meals.reload();
    this.meals.selectWeek(week);
  }

  cancelPendingImport(): void {
    this.pendingImport = null;
  }

  private saveImport(parsed: ParsedWorkbook, sheetUrl: string): string {
    const { sheetData, sheetDate, foodInfo } = parsed;
    const week = this.getDateString(sheetDate!);
    this.storage.dropOldSheets(this.getDateString(this.getMonday()));
    this.storage.setSheetData(week, sheetData, sheetUrl);
    this.storage.setFoodInfo(week, foodInfo);
    return week;
  }

  async availableDays(link: string, mode: 'replace' | 'add' = 'replace'): Promise<string[]> {
    if (!link.trim()) throw new Error('Пожалуйста, введите ссылку');
    const sheetId = this.extractId(link.trim());
    if (!sheetId) {
      throw new Error('Неверная ссылка на Google-таблицу');
    }
    const sheetUrl = this.getSheetUrl(sheetId);
    this.pendingAddition = null;
    const { sheetData } = await this.downloadData(sheetUrl, false);
    const days = mode === 'add' ? DAY_NAMES : this.parser.getAvailableDays(sheetData);
    if (!days.length) {
      throw new Error('Не удалось найти дни с едой');
    }
    this.pendingAddition = { sheetUrl, sheetData };
    return days;
  }

  async addDays(
    date: string,
    link: string,
    days: string[],
    mode: 'replace' | 'add',
  ): Promise<void> {
    if (!link.trim()) throw new Error('Пожалуйста, введите ссылку');
    const sheetId = this.extractId(link.trim());
    if (!sheetId) {
      throw new Error('Неверная ссылка на Google-таблицу');
    }
    const sheetUrl = this.getSheetUrl(sheetId);
    const sheetData =
      this.pendingAddition?.sheetUrl === sheetUrl
        ? this.pendingAddition.sheetData
        : (await this.downloadData(sheetUrl, false)).sheetData;
    this.pendingAddition = null;
    const currentData = this.storage.getSheetData(date) ?? {};
    if (mode === 'add') {
      this.parser.mergeFoodIntoDay(currentData, sheetData, days[0]);
      this.storage.setSheetData(date, currentData);
      this.storage.setAddedFoodLink(date, sheetUrl, days[0]);
      this.storage.clearEatenDays(date, [days[0]]);
    } else {
      this.parser.mergeSheetDays(currentData, sheetData, days);
      this.storage.setSheetData(date, currentData);
      this.storage.setAddedSheetLink(date, sheetUrl, days);
      this.storage.clearEatenDays(date, days);
    }
    this.meals.reload();
    this.meals.selectWeek(date);
  }

  async addMenu(date: string, link: string): Promise<void> {
    if (!link.trim()) throw new Error('Пожалуйста, введите ссылку');
    const sheetId = this.extractId(link.trim());
    if (!sheetId) {
      throw new Error('Неверная ссылка на Google-таблицу');
    }
    const sheetUrl = this.getSheetUrl(sheetId);
    const importedInfo = await this.downloadFoodInfo(sheetUrl);
    const currentInfo = this.storage.getFoodInfo(date);
    Object.assign(currentInfo, importedInfo);
    this.storage.setFoodInfo(date, currentInfo);
    this.storage.addMenuLink(date, sheetUrl);
    this.meals.reload();
    this.meals.selectWeek(date);
  }

  async refresh(): Promise<void> {
    const date = this.meals.selectedWeek();
    const links = date ? this.storage.getSheetLinks(date) : null;
    if (!date || !links?.main) {
      return;
    }
    const { sheetData, foodInfo } = await this.downloadData(links.main, false);
    for (const addition of links.days) {
      const { sheetData: addedData } = await this.downloadData(addition.link, false);
      if (addition.mode === 'add') {
        this.parser.mergeFoodIntoDay(sheetData, addedData, addition.days[0]);
      } else {
        this.parser.mergeSheetDays(sheetData, addedData, addition.days);
      }
    }
    for (const menuLink of links.menu) {
      Object.assign(foodInfo, await this.downloadFoodInfo(menuLink));
    }
    this.storage.setSheetData(date, sheetData);
    this.storage.setFoodInfo(date, foodInfo);
    this.meals.reload();
    this.meals.selectWeek(date);
  }

  private async downloadData(sheetUrl: string, requireDate = true) {
    const workbook = await this.downloadWorkbook(sheetUrl);
    return this.parser.parseWorkbook(workbook, await import('xlsx'), requireDate);
  }

  private async downloadWorkbook(sheetUrl: string): Promise<XLSXWorkbook> {
    const response = await fetch(`${sheetUrl}/export?format=xlsx`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    });
    if (!response.ok) {
      throw new Error(`Ошибка загрузки таблицы: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(arrayBuffer, { type: 'array' }) as XLSXWorkbook;
    const disposition = response.headers.get('Content-Disposition');
    const filename = disposition?.match(/(?:^|;)\s*filename\s*=\s*(?:"([^"]*)"|([^;]*))/i);
    workbook.fileName = filename ? (filename[1] ?? filename[2]).trim() : null;
    return workbook;
  }

  private async downloadFoodInfo(sheetUrl: string): Promise<Record<string, any>> {
    const workbook = await this.downloadWorkbook(sheetUrl);
    const foodInfo = this.parser.getFoodInfo(workbook, await import('xlsx'));
    if (Object.keys(foodInfo).length) {
      return foodInfo;
    }
    throw new Error('Не удалось найти меню');
  }

  private extractId(url: string): string | null {
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  }

  private getSheetUrl(sheetId: string): string {
    return `https://docs.google.com/spreadsheets/d/${sheetId}`;
  }

  private getMonday(): Date {
    const date = new Date();
    const day = date.getDay();
    date.setDate(date.getDate() - day + (day === 0 ? -6 : 1));
    return date;
  }

  private getDateString(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
