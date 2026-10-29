import { Component } from '@angular/core';
import { MEAL_ICONS } from '../../services/meal-data.service';

@Component({
  selector: 'app-loading-panel',
  standalone: true,
  host: { class: 'loader-panel flex flex-stretch' },
  templateUrl: './loading-panel.component.html',
})
export class LoadingPanelComponent {
  readonly icons = MEAL_ICONS;
}
