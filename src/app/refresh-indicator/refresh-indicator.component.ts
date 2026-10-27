import { Component, ViewEncapsulation, input } from '@angular/core';

@Component({
  selector: 'app-refresh-indicator',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  template: `<div
    class="refresh"
    [class.is-refreshing]="refreshing()"
    [class.ready]="ready()"
    [style.height.px]="pull() / 3"
  >
    <div class="refresh-loader"></div>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="refresh-arrow"
      viewBox="0 0 115.4 122.88"
      [style.transform]="'rotate(' + (ready() ? 0 : 0.5 * (1 - pull() / 100)) + 'turn)'"
    >
      <path
        d="M24.94,67.88A14.66,14.66,0,0,1,4.38,47L47.83,4.21a14.66,14.66,0,0,1,20.56,0L111,46.15A14.66,14.66,0,0,1,90.46,67.06l-18-17.69-.29,59.17c-.1,19.28-29.42,19-29.33-.25L43.14,50,24.94,67.88Z"
      />
    </svg>
  </div>`,
})
export class RefreshIndicatorComponent {
  readonly pull = input(0);
  readonly ready = input(false);
  readonly refreshing = input(false);
}
