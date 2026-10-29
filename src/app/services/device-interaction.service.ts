import { Injectable, computed, signal } from '@angular/core';

interface GestureActions {
  refresh: () => Promise<void>;
  canRefresh: () => boolean;
  nextDay: (direction: -1 | 1) => string;
  navigateDay: (direction: -1 | 1) => void;
}

@Injectable({ providedIn: 'root' })
export class DeviceInteractionService {
  readonly threshold = 210;
  readonly pull = signal(0);
  readonly ready = signal(false);
  readonly refreshing = signal(false);
  readonly swipeOffset = signal(0);
  readonly previewDay = signal('');
  readonly previewDirection = signal<-1 | 1>(1);
  readonly pageWidth = signal(1);
  readonly swipeTransition = signal('');
  readonly previewOffset = computed(
    () => this.swipeOffset() + this.previewDirection() * this.pageWidth(),
  );
  readonly pageOpacity = computed(() =>
    Math.max(0.65, 1 - (Math.abs(this.swipeOffset()) / this.pageWidth()) * 0.35),
  );
  readonly previewOpacity = computed(() =>
    Math.min(1, 0.65 + (Math.abs(this.swipeOffset()) / this.pageWidth()) * 0.35),
  );

  attach(element: HTMLElement, actions: GestureActions): () => void {
    let startX = 0;
    let startY = 0;
    let pullCandidate = false;
    let swipeCandidate = false;
    let mode: 'pull' | 'swipe' | '' = '';
    let tracking = false;
    let sliding = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const transition = 'transform 180ms ease-out, opacity 180ms ease-out';

    const resetSwipe = () => {
      this.swipeOffset.set(0);
      this.previewDay.set('');
      this.swipeTransition.set('');
      sliding = false;
    };
    const resetPull = () => {
      this.pull.set(0);
      this.ready.set(false);
    };
    const snapBack = () => {
      tracking = false;
      if (!this.swipeOffset()) {
        resetSwipe();
        return;
      }
      sliding = true;
      this.swipeTransition.set(transition);
      this.swipeOffset.set(0);
      clearTimeout(timer);
      timer = setTimeout(resetSwipe, 180);
    };
    const start = (event: TouchEvent) => {
      if (this.refreshing() || sliding) return;
      const target = event.target instanceof Element ? event.target : null;
      if (event.touches.length !== 1 || target?.closest('dialog,select,option')) {
        tracking = false;
        resetPull();
        resetSwipe();
        return;
      }
      startX = event.touches[0].clientX;
      startY = event.touches[0].clientY;
      pullCandidate = window.scrollY === 0 && actions.canRefresh();
      swipeCandidate = !!target?.closest('#jsonDisplay');
      tracking = pullCandidate || swipeCandidate;
      mode = '';
      this.swipeTransition.set('');
      this.pageWidth.set(
        Math.max(element.querySelector('#jsonDisplay')?.getBoundingClientRect().width ?? 1, 1),
      );
    };
    const move = (event: TouchEvent) => {
      if (!tracking) return;
      if (event.touches.length !== 1) {
        tracking = false;
        resetPull();
        snapBack();
        return;
      }
      const dx = event.touches[0].clientX - startX;
      const dy = event.touches[0].clientY - startY;
      if (!mode || mode === 'pull') {
        if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
          pullCandidate = false;
          resetPull();
          if (!swipeCandidate) {
            tracking = false;
            return;
          }
          mode = 'swipe';
        } else if (!mode && dy > 0 && pullCandidate) {
          mode = 'pull';
        } else if (!mode && dy < -10) {
          tracking = false;
          return;
        }
      }
      if (mode === 'swipe') {
        if (Math.abs(dy) > 40 && Math.abs(dy) > Math.abs(dx)) {
          snapBack();
          return;
        }
        if (Math.abs(dy) > 40) return;
        const direction = dx < 0 ? 1 : -1;
        const next = actions.nextDay(direction);
        this.previewDirection.set(direction);
        this.previewDay.set(next);
        this.swipeOffset.set(next ? dx : dx / 3);
        if (Math.abs(dx) > 8 && event.cancelable) event.preventDefault();
      } else if (mode === 'pull') {
        this.pull.set(Math.max(0, Math.min(dy, this.threshold)));
        this.ready.set(dy >= this.threshold);
        if (event.cancelable) event.preventDefault();
      }
    };
    const end = async () => {
      if (!tracking) return;
      tracking = false;
      if (mode === 'pull') {
        if (this.ready()) {
          this.refreshing.set(true);
          try {
            await actions.refresh();
          } finally {
            this.refreshing.set(false);
            resetPull();
          }
        } else {
          resetPull();
        }
      } else if (mode === 'swipe') {
        const direction = this.swipeOffset() < 0 ? 1 : -1;
        if (Math.abs(this.swipeOffset()) >= 60 && actions.nextDay(direction)) {
          sliding = true;
          this.swipeTransition.set(transition);
          this.swipeOffset.set(-direction * this.pageWidth());
          timer = setTimeout(() => {
            actions.navigateDay(direction);
            resetSwipe();
          }, 180);
        } else {
          snapBack();
        }
      }
      mode = '';
    };
    const cancel = () => {
      tracking = false;
      mode = '';
      resetPull();
      snapBack();
    };
    document.addEventListener('touchstart', start, { passive: true });
    document.addEventListener('touchmove', move, { passive: false });
    document.addEventListener('touchend', end);
    document.addEventListener('touchcancel', cancel);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('touchstart', start);
      document.removeEventListener('touchmove', move);
      document.removeEventListener('touchend', end);
      document.removeEventListener('touchcancel', cancel);
      resetPull();
      resetSwipe();
    };
  }
}
