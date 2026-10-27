import { Component, ViewChild, ElementRef, ViewEncapsulation, input } from '@angular/core';

interface FoodInfo {
  weight?: string;
  calories?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
  allergens?: string;
  infoRU?: string;
  vegeterian?: boolean;
  price?: number;
  shelfLife?: string;
  infoRS?: string;
}

@Component({
  selector: 'app-food-info-dialog',
  standalone: true,
  templateUrl: './food-info-dialog.component.html',
  encapsulation: ViewEncapsulation.None,
})
export class FoodInfoDialogComponent {
  readonly itemName = input('');
  readonly info = input<FoodInfo | null>(null);
  @ViewChild('dialog') dialog!: ElementRef<HTMLDialogElement>;

  open(): void {
    this.dialog.nativeElement.showModal();
  }
}
