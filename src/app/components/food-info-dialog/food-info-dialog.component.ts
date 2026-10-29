import { Component, ViewChild, ElementRef, ViewEncapsulation, input, signal } from '@angular/core';
import { FoodInfo, MealView } from '../../models/meal-view';

@Component({
  selector: 'app-food-info-dialog',
  standalone: true,
  templateUrl: './food-info-dialog.component.html',
  encapsulation: ViewEncapsulation.None,
})
export class FoodInfoDialogComponent {
  readonly items = input<MealView[]>([]);
  readonly selectedIndex = signal<number | null>(null);
  @ViewChild('dialog') dialog!: ElementRef<HTMLDialogElement>;
  @ViewChild('content') content!: ElementRef<HTMLElement>;

  open(index?: number): void {
    this.selectedIndex.set(index ?? null);
    this.dialog.nativeElement.showModal();
    this.content.nativeElement.scrollTop = 0;
    if (index !== undefined) this.scrollTo(index);
  }

  scrollTo(index: number): void {
    this.selectedIndex.set(index);
    const content = this.content.nativeElement;
    const section = content.querySelector<HTMLElement>('[data-index="' + index + '"]');
    if (section) content.scrollTo({ top: section.offsetTop, behavior: 'smooth' });
  }

  select(index: number): void {
    this.selectedIndex.set(index);
  }

  closeOutside(event: MouseEvent): void {
    const bounds = this.dialog.nativeElement.getBoundingClientRect();
    if (
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom
    ) {
      this.dialog.nativeElement.close();
    }
  }

  fields(info: FoodInfo): { label: string; value: string }[] {
    const fields: [string, unknown, string][] = [
      ['Вес', info.weight, ''],
      ['Цена', info.price, ' дин'],
      ['Калории', info.calories, ' ккал'],
      ['Белки', info.protein, ' г'],
      ['Жиры', info.fat, ' г'],
      ['Углеводы', info.carbs, ' г'],
      ['Срок хранения', info.shelfLife, ' ч'],
      ['', info.onion ? '🧅' : null, ''],
    ];
    return fields
      .filter(([, value]) => value)
      .map(([label, value, suffix]) => ({ label, value: String(value) + suffix }));
  }
}
