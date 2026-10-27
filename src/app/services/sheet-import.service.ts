import { Injectable } from '@angular/core';
import type * as XLSXTypes from 'xlsx';
import { MealDataService } from './meal-data.service';
import { StorageService } from './storage.service';
import { WorkbookParserService } from './workbook-parser.service';

type XLSXWorkbook = XLSXTypes.WorkBook & { fileName?: string | null };

@Injectable({ providedIn: 'root' })
export class SheetImportService {
  constructor(
    private meals: MealDataService,
    private storage: StorageService,
    private parser: WorkbookParserService,
  ) {}

  async import(link: string): Promise<void> {
    const sheetId = this.extractId(link.trim());
    if (!sheetId) {
      throw new Error('Неверная ссылка на Google-таблицу');
    }
    const date = await this.download(sheetId, false);
    this.meals.reload();
    this.meals.selectWeek(date);
  }

  async availableDays(link: string): Promise<string[]> {
    const sheetId = this.extractId(link.trim());
    if (!sheetId) {
      throw new Error('Неверная ссылка на Google-таблицу');
    }
    const { sheetData } = await this.downloadData(this.getSheetUrl(sheetId), false);
    const days = this.parser.getAvailableDays(sheetData);
    if (!days.length) {
      throw new Error('Не удалось найти дни с едой');
    }
    return days;
  }

  async addDays(
    date: string,
    link: string,
    days: string[],
    mode: 'replace' | 'add',
  ): Promise<void> {
    const sheetId = this.extractId(link.trim());
    if (!sheetId) {
      throw new Error('Неверная ссылка на Google-таблицу');
    }
    const sheetUrl = this.getSheetUrl(sheetId);
    const { sheetData } = await this.downloadData(sheetUrl, false);
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
    const { sheetData, foodInfo } = await this.downloadData(links.main);
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

  private async download(sheetId: string, refreshing: boolean): Promise<string> {
    const sheetUrl = this.getSheetUrl(sheetId);
    const { sheetData, sheetDate, foodInfo } = await this.downloadData(sheetUrl);
    if (!refreshing) {
      this.storage.dropOldSheets(this.getDateString(this.getMonday()));
    }
    const sheetDateString = this.getDateString(sheetDate!);
    this.storage.setSheetData(sheetDateString, sheetData, refreshing ? null : sheetUrl);
    this.storage.setFoodInfo(sheetDateString, foodInfo);
    return sheetDateString;
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
