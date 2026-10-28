import {
  Component,
  DestroyRef,
  ViewEncapsulation,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { MEAL_ICONS, MealDataService } from '../../services/meal-data.service';

@Component({
  selector: 'app-meal-actions',
  standalone: true,
  templateUrl: './meal-actions.component.html',
  encapsulation: ViewEncapsulation.None,
})
export class MealActionsComponent {
  readonly meals = inject(MealDataService);
  readonly day = input('');
  readonly preview = input(false);
  readonly hasFoodInfo = input(false);
  readonly foodInfoOpen = output<void>();
  readonly copyDisabled = signal(false);
  readonly canShare = typeof navigator.share === 'function';
  private copyTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.copyTimer));
  }

  async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.shareText());
      this.copyDisabled.set(true);
      clearTimeout(this.copyTimer);
      this.copyTimer = setTimeout(() => this.copyDisabled.set(false), 2000);
    } catch {
      this.meals.error.set('Не удалось скопировать текст');
    }
  }

  async share(): Promise<void> {
    try {
      await navigator.share({ title: 'Еда за ' + this.day(), text: this.shareText() });
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        this.meals.error.set('Не удалось поделиться');
      }
    }
  }

  private shareText(): string {
    const eaten = this.meals.eaten();
    const lines = this.meals
      .meals()
      .flatMap((meal, index) =>
        meal && !eaten.includes(index) ? [MEAL_ICONS[index] + ' ' + meal] : [],
      );
    return 'Привет! Съешьте пожалуйста мою еду' + (lines.length ? '\n\n' + lines.join('\n\n') : '');
  }
}
