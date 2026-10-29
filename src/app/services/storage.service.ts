import { Injectable } from '@angular/core';

export interface SavedSheet {
  date: string;
  link: string;
  additions: { days: string; link: string }[];
}

interface StoredSheetLinks {
  main: string | null;
  days: { link: string; days: string[]; mode: 'replace' | 'add' }[];
  menu: string[];
}

@Injectable({ providedIn: 'root' })
export class StorageService {
  getSheetDates(): string[] {
    return this.read<string[]>('sheetDates') ?? [];
  }

  getSheets(): SavedSheet[] {
    return this.getSheetDates()
      .sort()
      .map((date) => {
        const links = this.read<any>(`sheetLink_${date}`) ?? { main: null, days: [], menu: [] };
        const additions = (links.days ?? []).map((entry: any) => ({
          days: `${entry.mode === 'add' ? '+' : ''}${entry.days.join('-')}`,
          link: entry.link,
        }));
        additions.push(...(links.menu ?? []).map((link: string) => ({ days: 'меню', link })));
        return { date, link: links.main, additions };
      });
  }

  getSheetData(date: string): Record<string, Record<string, (string | null)[]>> | null {
    return this.read(`sheetData_${date}`);
  }

  getFoodInfo(date: string): Record<string, any> {
    return this.read(`foodInfo_${date}`) ?? {};
  }

  getEaten(date: string): Record<string, Record<string, number[]>> {
    return this.read(`eaten_${date}`) ?? {};
  }

  setEaten(date: string, data: unknown): void {
    this.write(`eaten_${date}`, data);
  }

  setSheetData(date: string, data: unknown, link?: string | null): void {
    this.write(`sheetData_${date}`, data);
    if (!link) {
      return;
    }

    const dates = this.getSheetDates();
    if (!dates.includes(date)) {
      dates.push(date);
      this.write('sheetDates', dates);
    }
    this.write(`sheetLink_${date}`, { main: link, days: [], menu: [] });
  }

  dropOldSheets(monday: string): void {
    const dates = this.getSheetDates();
    const remaining = dates.filter((date) => date >= monday);
    for (const date of dates.filter((item) => item < monday)) {
      this.removeWeekKeys(date);
    }
    if (remaining.length !== dates.length) {
      this.write('sheetDates', remaining);
    }
  }

  setFoodInfo(date: string, data: unknown): void {
    this.write(`foodInfo_${date}`, data);
  }

  getSheetLinks(date: string): StoredSheetLinks {
    return this.read<StoredSheetLinks>(`sheetLink_${date}`) ?? { main: null, days: [], menu: [] };
  }

  setAddedSheetLink(date: string, link: string, dayNames: string[]): void {
    const links = this.getSheetLinks(date);
    const selectedDays = new Set(dayNames);
    links.days = links.days
      .map((entry) =>
        entry.mode === 'replace'
          ? { ...entry, days: entry.days.filter((day) => !selectedDays.has(day)) }
          : entry,
      )
      .filter((entry) => entry.days.length > 0);
    links.days.push({ link, days: dayNames, mode: 'replace' });
    this.write(`sheetLink_${date}`, links);
  }

  setAddedFoodLink(date: string, link: string, dayName: string): void {
    const links = this.getSheetLinks(date);
    links.days = links.days.filter(
      (entry) => entry.mode !== 'add' || !entry.days.includes(dayName),
    );
    links.days.push({ link, days: [dayName], mode: 'add' });
    this.write(`sheetLink_${date}`, links);
  }

  addMenuLink(date: string, link: string): void {
    const links = this.getSheetLinks(date);
    links.menu.push(link);
    this.write(`sheetLink_${date}`, links);
  }

  clearEatenDays(date: string, dayNames: string[]): void {
    const eaten = this.getEaten(date);
    for (const employeeData of Object.values(eaten)) {
      for (const day of dayNames) {
        delete employeeData[day];
      }
    }
    this.setEaten(date, eaten);
  }

  getMascot(): string {
    return this.read<{ name: string }>('mascot')?.name ?? 'donkey';
  }

  setMascot(name: string): void {
    this.write('mascot', { name });
  }

  private read<T>(key: string): T | null {
    try {
      const value = localStorage.getItem(key);
      return value ? (JSON.parse(value) as T) : null;
    } catch {
      return null;
    }
  }

  private write(key: string, value: unknown): void {
    localStorage.setItem(key, JSON.stringify(value));
  }

  private removeWeekKeys(date: string): void {
    for (const key of [
      `eaten_${date}`,
      `sheetData_${date}`,
      `sheetLink_${date}`,
      `foodInfo_${date}`,
    ]) {
      localStorage.removeItem(key);
    }
  }
}
