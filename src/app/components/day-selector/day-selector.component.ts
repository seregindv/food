import { Component, ViewEncapsulation, inject } from '@angular/core';
import { DAY_NAMES, MealDataService } from '../../services/meal-data.service';

@Component({
  selector: 'app-day-selector',
  standalone: true,
  templateUrl: './day-selector.component.html',
  encapsulation: ViewEncapsulation.None,
})
export class DaySelectorComponent {
  readonly meals = inject(MealDataService);
  readonly dayNames = DAY_NAMES;
}
