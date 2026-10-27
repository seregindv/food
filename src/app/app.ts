import { AfterViewInit, Component, DestroyRef, ElementRef, ViewChild, inject } from '@angular/core';
import { MealDataService } from './services/meal-data.service';
import { SheetImportService } from './services/sheet-import.service';
import { DeviceInteractionService } from './services/device-interaction.service';
import { RefreshIndicatorComponent } from './refresh-indicator/refresh-indicator.component';
import { WeekSelectorComponent } from './components/week-selector/week-selector.component';
import { SheetSettingsComponent } from './components/sheet-settings/sheet-settings.component';
import { EmployeeSelectorComponent } from './components/employee-selector/employee-selector.component';
import { DaySelectorComponent } from './components/day-selector/day-selector.component';
import { MealListComponent } from './components/meal-list/meal-list.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RefreshIndicatorComponent,
    WeekSelectorComponent,
    SheetSettingsComponent,
    EmployeeSelectorComponent,
    DaySelectorComponent,
    MealListComponent
  ],
  templateUrl: './app.html',
})
export class App implements AfterViewInit {
  @ViewChild('main') main!: ElementRef<HTMLElement>;
  readonly meals = inject(MealDataService);
  readonly sheetImport = inject(SheetImportService);
  readonly device = inject(DeviceInteractionService);
  private readonly destroyRef = inject(DestroyRef);
  settingsOpen = this.meals.sheets().length === 0;

  ngAfterViewInit(): void {
    const detach = this.device.attach(
      this.main.nativeElement,
      () => this.refresh(),
      direction => this.navigateDay(direction),
    );
    this.destroyRef.onDestroy(detach);
  }

  async refresh(): Promise<void> {
    try {
      await this.sheetImport.refresh();
    } catch (error) {
      this.meals.error.set(error instanceof Error ? error.message : 'Не удалось обновить данные');
    }
  }

  navigateDay(direction: -1 | 1): void {
    const days = this.meals.days();
    const index = days.indexOf(this.meals.selectedDay());
    const next = days[index + direction];
    if (next) {
      this.meals.selectDay(next);
    }
  }
}
