import { Component, ElementRef, ViewChild, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MealDataService } from '../../services/meal-data.service';
import { SheetImportService } from '../../services/sheet-import.service';

@Component({
  selector: 'app-sheet-settings',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './sheet-settings.component.html',
  encapsulation: ViewEncapsulation.None,
})
export class SheetSettingsComponent {
  @ViewChild('daysDialog') daysDialog!: ElementRef<HTMLDialogElement>;
  link = '';
  additionMode: 'replace' | 'add' | 'menu' | null = null;
  availableDays: string[] = [];
  chosenDays: string[] = [];

  constructor(
    readonly meals: MealDataService,
    private sheetImport: SheetImportService,
  ) {}

  async upload(): Promise<void> {
    this.meals.error.set('');
    this.meals.loading.set(true);
    try {
      await this.sheetImport.import(this.link);
    } catch (error) {
      this.meals.error.set(error instanceof Error ? error.message : 'Не удалось загрузить таблицу');
    } finally {
      this.meals.loading.set(false);
    }
  }

  async beginAddition(mode: 'replace' | 'add' | 'menu'): Promise<void> {
    const date = this.meals.selectedWeek();
    if (!date) {
      this.meals.error.set('Сначала выберите неделю');
      return;
    }
    this.meals.error.set('');
    this.meals.loading.set(true);
    try {
      if (mode === 'menu') {
        await this.sheetImport.addMenu(date, this.link);
        return;
      }
      this.availableDays = await this.sheetImport.availableDays(this.link);
      this.additionMode = mode;
      this.chosenDays = [];
      this.daysDialog.nativeElement.showModal();
    } catch (error) {
      this.meals.error.set(error instanceof Error ? error.message : 'Не удалось добавить таблицу');
    } finally {
      this.meals.loading.set(false);
    }
  }

  async confirmAddition(): Promise<void> {
    const mode = this.additionMode;
    if (!mode || mode === 'menu' || !this.chosenDays.length) {
      return;
    }
    this.daysDialog.nativeElement.close();
    this.meals.loading.set(true);
    try {
      await this.sheetImport.addDays(this.meals.selectedWeek(), this.link, this.chosenDays, mode);
    } catch (error) {
      this.meals.error.set(error instanceof Error ? error.message : 'Не удалось добавить дни');
    } finally {
      this.meals.loading.set(false);
      this.additionMode = null;
    }
  }

  setChosenDay(day: string, checked: boolean): void {
    this.chosenDays = checked
      ? [...new Set([...this.chosenDays, day])]
      : this.chosenDays.filter((item) => item !== day);
  }

  cancelAddition(): void {
    this.daysDialog.nativeElement.close();
    this.additionMode = null;
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
