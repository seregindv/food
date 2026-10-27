import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DeviceInteractionService {
  readonly pull = signal(0);
  readonly ready = signal(false);
  readonly refreshing = signal(false);
  private startY = 0;
  private tracking = false;
  private readonly threshold = 100;

  attach(
    element: HTMLElement,
    refresh: () => Promise<void>,
    navigateDay: (direction: -1 | 1) => void,
  ): () => void {
    const start = (event: TouchEvent) => {
      if (
        window.scrollY !== 0 ||
        event.touches.length !== 1 ||
        (event.target as HTMLElement).closest('dialog,select,option')
      ) {
        this.tracking = false;
        return;
      }
      this.startY = event.touches[0].screenY;
      this.tracking = true;
    };
    const move = (event: TouchEvent) => {
      if (!this.tracking || event.touches.length !== 1) {
        return;
      }
      const delta = event.touches[0].screenY - this.startY;
      if (delta < 0) {
        this.tracking = false;
        this.pull.set(0);
        return;
      }
      this.pull.set(Math.min(delta, this.threshold));
      this.ready.set(delta >= this.threshold);
      if (event.cancelable) {
        event.preventDefault();
      }
    };
    const end = async () => {
      if (!this.tracking) {
        return;
      }
      this.tracking = false;
      if (this.ready()) {
        this.refreshing.set(true);
        try {
          await refresh();
        } finally {
          this.refreshing.set(false);
        }
      }
      this.pull.set(0);
      this.ready.set(false);
    };
    let dayStart: { x: number; y: number } | null = null;
    let horizontal = false;
    const dayTouchStart = (event: TouchEvent) => {
      const target = event.target as HTMLElement;
      dayStart =
        target.closest('#jsonDisplay') &&
        !target.closest('input, button') &&
        event.touches.length === 1
          ? { x: event.touches[0].clientX, y: event.touches[0].clientY }
          : null;
      horizontal = false;
    };
    const dayTouchMove = (event: TouchEvent) => {
      if (!dayStart || event.touches.length !== 1) {
        return;
      }
      const dx = event.touches[0].clientX - dayStart.x;
      const dy = event.touches[0].clientY - dayStart.y;
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
        horizontal = true;
        if (event.cancelable) {
          event.preventDefault();
        }
      }
    };
    const dayTouchEnd = (event: TouchEvent) => {
      if (dayStart && horizontal) {
        const endX = event.changedTouches[0]?.clientX ?? dayStart.x;
        const dx = endX - dayStart.x;
        if (Math.abs(dx) >= 60) {
          navigateDay(dx < 0 ? 1 : -1);
        }
      }
      dayStart = null;
      horizontal = false;
    };
    element.addEventListener('touchstart', start, { passive: true });
    element.addEventListener('touchmove', move, { passive: false });
    element.addEventListener('touchend', end);
    element.addEventListener('touchcancel', end);
    element.addEventListener('touchstart', dayTouchStart, { passive: true });
    element.addEventListener('touchmove', dayTouchMove, { passive: false });
    element.addEventListener('touchend', dayTouchEnd);
    element.addEventListener('touchcancel', dayTouchEnd);
    return () => {
      element.removeEventListener('touchstart', start);
      element.removeEventListener('touchmove', move);
      element.removeEventListener('touchend', end);
      element.removeEventListener('touchcancel', end);
      element.removeEventListener('touchstart', dayTouchStart);
      element.removeEventListener('touchmove', dayTouchMove);
      element.removeEventListener('touchend', dayTouchEnd);
      element.removeEventListener('touchcancel', dayTouchEnd);
    };
  }
}
