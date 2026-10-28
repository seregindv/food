import { Injectable, signal } from '@angular/core';
import { StorageService, SavedSheet } from './storage.service';
import { FoodInfo, MealView, mealNames } from '../models/meal-view';

export const DAY_NAMES = ['пн', 'вт', 'ср', 'чт', 'пт'];
export const MEAL_ICONS = [
  '🍳',
  '1️⃣',
  '2️⃣',
  '🧋',
  '🥨',
  '🫘',
  '🍲',
  '🥗',
  '🍗',
  '🍟',
  '🍰',
  '🧂',
  '🥪',
];

@Injectable({ providedIn: 'root' })
export class MealDataService {
  readonly sheets = signal<SavedSheet[]>([]);
  readonly selectedWeek = signal('');
  readonly selectedEmployee = signal('');
  readonly selectedDay = signal('');
  readonly error = signal('');
  readonly loading = signal(false);
  readonly data = signal<Record<string, Record<string, (string | null)[]>>>({});
  readonly foodInfo = signal<Record<string, FoodInfo>>({});
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
    const remembered = localStorage.getItem('selectedEmployee') ?? '';
    this.selectedEmployee.set(this.employees().includes(remembered) ? remembered : '');
    this.selectedDay.set(this.defaultDay());
    this.selectEmployee(this.selectedEmployee(), false);
  }

  selectEmployee(employee: string, remember = true): void {
    this.selectedEmployee.set(employee);
    if (remember) {
      if (employee) localStorage.setItem('selectedEmployee', employee);
      else localStorage.removeItem('selectedEmployee');
    }
    const employeeData = this.data()[employee] ?? {};
    this.days.set(DAY_NAMES.filter((day) => (employeeData[day]?.length ?? 0) > 0));
    if (!this.days().includes(this.selectedDay())) {
      const desired = DAY_NAMES.indexOf(this.selectedDay() || this.defaultDay());
      const next = DAY_NAMES.slice(desired).find((day) => this.days().includes(day));
      const previous = DAY_NAMES.slice(0, desired)
        .reverse()
        .find((day) => this.days().includes(day));
      this.selectedDay.set(next ?? previous ?? '');
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
    if (this.selectedWeek() === date) this.selectedWeek.set('');
    this.reload();
  }

  updateMascot(): void {
    const next = this.mascot() === 'donkey' ? 'cake' : 'donkey';
    this.storage.setMascot(next);
    this.mascot.set(next);
  }

  itemsForDay(day: string): MealView[] {
    const values = this.data()[this.selectedEmployee()]?.[day] ?? [];
    const eaten =
      day === this.selectedDay()
        ? this.eaten()
        : (this.storage.getEaten(this.selectedWeek())[this.selectedEmployee()]?.[day] ?? []);
    return values.flatMap((name, index) => {
      if (!name) return [];
      const info = this.foodInfo()[name.trim()];
      const numbers = [info?.calories, info?.protein, info?.fat, info?.carbs];
      return [
        {
          index,
          icon: MEAL_ICONS[index],
          name,
          ...mealNames(name),
          info,
          checked: eaten.includes(index),
          hasNutrition: numbers.some((value) => value != null),
          nutrition: numbers.map((value, i) =>
            value == null ? '' : String(value) + (i === 0 ? ' ккал' : ' г'),
          ),
        },
      ];
    });
  }

  hasFoodInfo(day: string): boolean {
    return this.itemsForDay(day).some((item) => !!item.info);
  }

  hasMeals(day: string): boolean {
    return (this.data()[this.selectedEmployee()]?.[day]?.length ?? 0) > 0;
  }

  employeeDays(employee: string): string {
    const data = this.data()[employee] ?? {};
    return DAY_NAMES.map((day) => (data[day] ? '●' : '○')).join('');
  }

  employeeIsEmpty(employee: string): boolean {
    return Object.keys(this.data()[employee] ?? {}).length === 0;
  }

  nextDay(direction: -1 | 1): string {
    const index = this.days().indexOf(this.selectedDay());
    return index < 0 ? '' : (this.days()[index + direction] ?? '');
  }

  warningForDay(day: string): boolean {
    const index = DAY_NAMES.indexOf(day);
    if (!this.selectedWeek() || index < 0) return true;
    const date = new Date(this.selectedWeek() + 'T00:00:00');
    date.setDate(date.getDate() + index);
    return date.toDateString() !== new Date().toDateString();
  }

  weekPriority(date = this.selectedWeek()): 'late' | 'normal' | 'early' {
    const monday = new Date();
    const weekday = monday.getDay();
    monday.setDate(monday.getDate() - weekday + (weekday === 0 ? -6 : 1));
    monday.setHours(0, 0, 0, 0);
    const nextMonday = new Date(monday);
    nextMonday.setDate(nextMonday.getDate() + 7);
    const week = new Date(date + 'T00:00:00');
    return week < monday ? 'late' : week >= nextMonday ? 'early' : 'normal';
  }

  isToday(day: string): boolean {
    return this.weekPriority() === 'normal' && DAY_NAMES[new Date().getDay() - 1] === day;
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
    return DAY_NAMES[weekday - 1] ?? 'пн';
  }
}
