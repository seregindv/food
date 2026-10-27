import { Component, ViewEncapsulation, output } from '@angular/core';
import { MealDataService } from '../../services/meal-data.service';

@Component({
  selector: 'app-week-selector',
  standalone: true,
  templateUrl: './week-selector.component.html',
  encapsulation: ViewEncapsulation.None,
})
export class WeekSelectorComponent {
  readonly settingsToggle = output<void>();

  constructor(readonly meals: MealDataService) {}

  dateNumber(date: string): number {
    return new Date(`${date}T00:00:00`).getDate();
  }

  monthName(date: string): string {
    return new Date(`${date}T00:00:00`).toLocaleString('ru-RU', { month: 'long' });
  }

  datePriority(date: string): string {
    const monday = new Date();
    const weekday = monday.getDay();
    monday.setDate(monday.getDate() - weekday + (weekday === 0 ? -6 : 1));
    monday.setHours(0, 0, 0, 0);
    const nextMonday = new Date(monday);
    nextMonday.setDate(nextMonday.getDate() + 7);
    const week = new Date(`${date}T00:00:00`);
    return week < monday ? 'late' : week >= nextMonday ? 'early' : 'normal';
  }
}
