import { Component, ViewEncapsulation, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MealDataService } from '../../services/meal-data.service';

@Component({
  selector: 'app-employee-selector',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './employee-selector.component.html',
  encapsulation: ViewEncapsulation.None,
})
export class EmployeeSelectorComponent {
  readonly meals = inject(MealDataService);
}
