import { Injectable, signal } from '@angular/core';
import { StorageService, SavedSheet } from './storage.service';

export const DAY_NAMES = ['пн', 'вт', 'ср', 'чт', 'пт'];
export const MEAL_ICONS = ['🍳', '1️⃣', '2️⃣', '🧋', '🥨', '🫘', '🍲', '🥗', '🍗', '🍟', '🍰', '🧂', '🥪'];

@Injectable({ providedIn: 'root' })
export class MealDataService {
  readonly sheets = signal<SavedSheet[]>([]);
  readonly selectedWeek = signal('');
  readonly selectedEmployee = signal('');
  readonly selectedDay = signal('');
  readonly error = signal('');
  readonly loading = signal(false);
  readonly data = signal<Record<string, Record<string, (string | null)[]>>>({});
  readonly foodInfo = signal<Record<string, any>>({});
  readonly employees = signal<string[]>([]);
  readonly meals = signal<(string | null)[]>([]);
  readonly eaten = signal<number[]>([]);
  readonly days = signal<string[]>(DAY_NAMES);
  readonly mascot = signal('donkey');

  constructor(private storage: StorageService) {
    this.mascot.set(storage.getMascot());
    this.selectedEmployee.set(localStorage.getItem('selectedEmployee') ?? '');
    this.reload();
  }

  reload(): void {
    this.sheets.set(this.storage.getSheets());
    if (!this.selectedWeek() || !this.storage.getSheetData(this.selectedWeek())) {
      const dates = this.storage.getSheetDates().sort();
      this.selectWeek(this.defaultWeek(dates));
    } else {
      this.selectWeek(this.selectedWeek());
    }
  }

  selectWeek(date: string): void {
    this.selectedWeek.set(date);
    this.data.set(date ? (this.storage.getSheetData(date) ?? {}) : {});
    this.foodInfo.set(date ? this.storage.getFoodInfo(date) : {});
    this.employees.set(Object.keys(this.data()).sort());
    if (!this.employees().includes(this.selectedEmployee())) {
      this.selectedEmployee.set('');
    }
    this.selectEmployee(this.selectedEmployee());
  }

  selectEmployee(employee: string): void {
    this.selectedEmployee.set(employee);
    if (employee) {
      localStorage.setItem('selectedEmployee', employee);
    } else {
      localStorage.removeItem('selectedEmployee');
    }
    const employeeData = this.data()[employee] ?? {};
    this.days.set(DAY_NAMES.filter((day) => (employeeData[day]?.length ?? 0) > 0));
    if (!this.days().includes(this.selectedDay())) {
      const today = this.defaultDay();
      this.selectedDay.set(this.days().includes(today) ? today : (this.days()[0] ?? ''));
    }
    this.selectDay(this.selectedDay());
  }

  selectDay(day: string): void {
    this.selectedDay.set(day);
    const employeeData = this.data()[this.selectedEmployee()] ?? {};
    this.meals.set(employeeData[day] ?? []);
    this.eaten.set(
      this.storage.getEaten(this.selectedWeek())[this.selectedEmployee()]?.[day] ?? [],
    );
  }

  setEaten(index: number, checked: boolean): void {
    const date = this.selectedWeek(),
      employee = this.selectedEmployee(),
      day = this.selectedDay();
    if (!date || !employee || !day) {
      return;
    }
    const all = this.storage.getEaten(date);
    const list = all[employee]?.[day] ?? [];
    const next = checked ? [...new Set([...list, index])] : list.filter((item) => item !== index);
    all[employee] = { ...(all[employee] ?? {}), [day]: next };
    this.storage.setEaten(date, all);
    this.eaten.set(next);
  }

  deleteWeek(date: string): void {
    for (const key of [
      `sheetData_${date}`,
      `sheetLink_${date}`,
      `eaten_${date}`,
      `foodInfo_${date}`,
    ]) {
      localStorage.removeItem(key);
    }
    localStorage.setItem(
      'sheetDates',
      JSON.stringify(this.storage.getSheetDates().filter((item) => item !== date)),
    );
    this.selectedWeek.set('');
    this.reload();
  }

  updateMascot(): void {
    const next = this.mascot() === 'donkey' ? 'cake' : 'donkey';
    this.storage.setMascot(next);
    this.mascot.set(next);
  }

  private defaultWeek(dates: string[]): string {
    const today = new Date();
    const weekday = today.getDay();
    today.setDate(today.getDate() - weekday + (weekday === 0 ? -6 : 1));
    today.setHours(0, 0, 0, 0);
    const next = new Date(today);
    next.setDate(next.getDate() + 7);
    const priority = (value: string) => {
      const date = new Date(`${value}T00:00:00`);
      return date < today ? 3 : date >= next ? 2 : 1;
    };
    return (
      dates.find((date) => priority(date) === 1) ??
      dates.find((date) => priority(date) === 2) ??
      dates[0] ??
      ''
    );
  }

  private defaultDay(): string {
    const weekday = new Date().getDay();
    return DAY_NAMES[Math.min(Math.max(weekday - 1, 0), 4)] ?? 'пн';
  }
}
