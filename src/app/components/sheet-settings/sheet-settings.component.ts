import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  ViewChild,
  ViewEncapsulation,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MealDataService } from '../../services/meal-data.service';
import { SheetImportService } from '../../services/sheet-import.service';
import { LoadingPanelComponent } from '../loading-panel/loading-panel.component';

@Component({
  selector: 'app-sheet-settings',
  standalone: true,
  imports: [FormsModule, LoadingPanelComponent],
  templateUrl: './sheet-settings.component.html',
  encapsulation: ViewEncapsulation.None,
})
export class SheetSettingsComponent {
  @ViewChild('daysDialog') daysDialog!: ElementRef<HTMLDialogElement>;
  @ViewChild('dateDialog') dateDialog!: ElementRef<HTMLDialogElement>;
  link = '';
  dropdownOpen = false;
  additionMode: 'replace' | 'add' | 'menu' | null = null;
  availableDays: string[] = [];
  chosenDays: string[] = [];
  importDate = this.getNextMondayString();
  private longPressTimer?: ReturnType<typeof setTimeout>;
  private suppressUpload = false;
  private readonly host = inject(ElementRef<HTMLElement>);
  readonly meals: MealDataService = inject(MealDataService);
  private readonly sheetImport = inject(SheetImportService);
  private readonly changeDetector = inject(ChangeDetectorRef);

  @HostListener('document:click', ['$event'])
  closeDropdownOutside(event: MouseEvent): void {
    const dropdown = this.host.nativeElement.querySelector('#uploadDropdown');
    if (dropdown && !dropdown.contains(event.target as Node)) this.dropdownOpen = false;
  }

  @HostListener('document:keydown.escape')
  closeDropdown(): void {
    this.dropdownOpen = false;
  }

  startLongPress(event: PointerEvent): void {
    if (event.pointerType !== 'touch') return;
    this.longPressTimer = setTimeout(() => {
      this.suppressUpload = true;
      this.dropdownOpen = true;
    }, 500);
  }

  cancelLongPress(): void {
    clearTimeout(this.longPressTimer);
  }

  uploadClick(event: MouseEvent): void {
    if (!this.suppressUpload) return;
    event.preventDefault();
    this.suppressUpload = false;
  }

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.longPressTimer));
  }

  async upload(): Promise<void> {
    this.dropdownOpen = false;
    this.meals.error.set('');
    this.meals.loading.set(true);
    try {
      const date = await this.sheetImport.import(this.link);
      if (date === null) {
        this.importDate = this.getNextMondayString();
        this.changeDetector.detectChanges();
        this.dateDialog.nativeElement.showModal();
      }
    } catch (error) {
      this.meals.error.set(error instanceof Error ? error.message : 'Не удалось загрузить таблицу');
    } finally {
      this.meals.loading.set(false);
    }
  }

  confirmImportDate(): void {
    this.dateDialog.nativeElement.close();
    this.sheetImport.completeImport(this.importDate);
  }

  cancelImportDate(): void {
    this.dateDialog.nativeElement.close();
    this.sheetImport.cancelPendingImport();
  }

  private getNextMondayString(): string {
    const date = new Date();
    const day = date.getDay();
    date.setDate(date.getDate() + ((8 - day) % 7 || 7));
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const dayOfMonth = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${dayOfMonth}`;
  }

  async beginAddition(mode: 'replace' | 'add' | 'menu'): Promise<void> {
    this.dropdownOpen = false;
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
      this.availableDays = await this.sheetImport.availableDays(this.link, mode);
      this.additionMode = mode;
      this.chosenDays = [];
      this.changeDetector.detectChanges();
      this.daysDialog.nativeElement.showModal();
    } catch (error) {
      this.meals.error.set(error instanceof Error ? error.message : 'Не удалось добавить таблицу');
    } finally {
      this.meals.loading.set(false);
    }
  }

  async confirmAddition(): Promise<void> {
    const mode = this.additionMode;
    this.daysDialog.nativeElement.close();
    if (!mode || mode === 'menu' || !this.chosenDays.length) {
      this.additionMode = null;
      return;
    }
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

  formatDate(date: string): string {
    return new Date(date + 'T00:00:00').toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
    });
  }
}
