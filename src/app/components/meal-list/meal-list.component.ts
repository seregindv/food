import { Component, ViewEncapsulation, computed, inject } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { MealDataService } from '../../services/meal-data.service';
import { DeviceInteractionService } from '../../services/device-interaction.service';
import { FoodInfoDialogComponent } from '../food-info-dialog/food-info-dialog.component';
import { MealActionsComponent } from '../meal-actions/meal-actions.component';

@Component({
  selector: 'app-meal-list',
  standalone: true,
  imports: [NgTemplateOutlet, FoodInfoDialogComponent, MealActionsComponent],
  templateUrl: './meal-list.component.html',
  encapsulation: ViewEncapsulation.None,
})
export class MealListComponent {
  readonly meals: MealDataService = inject(MealDataService);
  readonly device = inject(DeviceInteractionService);
  readonly foodItems = computed(() =>
    this.meals.itemsForDay(this.meals.selectedDay()).filter((item) => item.info),
  );
}
