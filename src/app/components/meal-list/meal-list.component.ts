import { Component, ViewEncapsulation } from '@angular/core';
import { MealDataService } from '../../services/meal-data.service';
import { FoodInfoDialogComponent } from '../food-info-dialog/food-info-dialog.component';
import { MealActionsComponent } from '../meal-actions/meal-actions.component';

@Component({
  selector: 'app-meal-list',
  standalone: true,
  imports: [FoodInfoDialogComponent, MealActionsComponent],
  templateUrl: './meal-list.component.html',
  encapsulation: ViewEncapsulation.None,
})
export class MealListComponent {
  constructor(readonly meals: MealDataService) {}
}
