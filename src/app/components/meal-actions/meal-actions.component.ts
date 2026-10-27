import { Component, ViewEncapsulation } from '@angular/core';
import { MEAL_ICONS, MealDataService } from '../../services/meal-data.service';

@Component({
  selector: 'app-meal-actions',
  standalone: true,
  templateUrl: './meal-actions.component.html',
  encapsulation: ViewEncapsulation.None,
})
export class MealActionsComponent {
  constructor(private meals: MealDataService) {}

  async copy(): Promise<void> {
    const text = this.shareText();
    if (text) {
      await navigator.clipboard.writeText(text);
    }
  }

  async share(): Promise<void> {
    const text = this.shareText();
    if (text && navigator.share) {
      await navigator.share({ title: `Еда за ${this.meals.selectedDay()}`, text });
    }
  }

  private shareText(): string {
    const lines = this.meals
      .meals()
      .flatMap((meal, index) =>
        meal && !this.meals.eaten().includes(index) ? [`${MEAL_ICONS[index]} ${meal}`] : [],
      );
    return lines.length ? `Привет! Съешьте пожалуйста мою еду\n\n${lines.join('\n\n')}` : '';
  }
}
