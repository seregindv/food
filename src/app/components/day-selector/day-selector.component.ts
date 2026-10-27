import { Component, ViewEncapsulation } from '@angular/core';
import { DAY_NAMES, MealDataService } from '../../services/meal-data.service';

@Component({
  selector: 'app-day-selector',
  standalone: true,
  templateUrl: './day-selector.component.html',
  encapsulation: ViewEncapsulation.None,
})
export class DaySelectorComponent {
  readonly dayNames = DAY_NAMES;

  constructor(readonly meals: MealDataService) {}
}
