import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const angular = {
  Injectable: () => (value) => value,
  Component: () => (value) => value,
  ViewEncapsulation: { None: 2 },
  input: (initial) => angular.signal(initial),
  output: () => ({ emit() {} }),
  inject: () => ({ onDestroy() {} }),
  signal(initial) {
    let value = initial;
    const read = () => value;
    read.set = (next) => {
      value = next;
    };
    return read;
  },
  computed: (read) => read,
};

function sourceModule(path, environment = {}, dependencies = {}) {
  const source = readFileSync(resolve(path), 'utf8');
  const javascript = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      experimentalDecorators: true,
    },
  }).outputText;
  const exports = {};
  vm.runInNewContext(
    javascript,
    {
      exports,
      require: (name) => {
        if (name === '@angular/core') return angular;
        if (name in dependencies) return dependencies[name];
        throw new Error('Unexpected dependency: ' + name);
      },
      ...environment,
    },
    { filename: path },
  );
  return exports;
}

class TouchTarget {
  constructor(kind = 'meal') {
    this.kind = kind;
  }
  closest(selector) {
    if (selector === '#jsonDisplay') return this.kind === 'meal' ? this : null;
    return selector.split(',').includes(this.kind) ? this : null;
  }
}

function gestures({
  days = ['пн', 'ср', 'чт'],
  selected = 'пн',
  scrollY = 0,
  canRefresh = true,
} = {}) {
  const handlers = new Map();
  const timers = new Map();
  let timerId = 0;
  let refreshCount = 0;
  let selectedDay = selected;
  const window = { scrollY };
  const document = {
    addEventListener: (name, listener) => handlers.set(name, listener),
    removeEventListener: (name) => handlers.delete(name),
  };
  const { DeviceInteractionService } = sourceModule(
    'src/app/services/device-interaction.service.ts',
    {
      Element: TouchTarget,
      window,
      document,
      setTimeout: (callback) => {
        timers.set(++timerId, callback);
        return timerId;
      },
      clearTimeout: (id) => timers.delete(id),
    },
  );
  const service = new DeviceInteractionService();
  const detach = service.attach(
    {
      querySelector: () => ({ getBoundingClientRect: () => ({ width: 350 }) }),
    },
    {
      canRefresh: () => canRefresh,
      nextDay: (direction) => days[days.indexOf(selectedDay) + direction] ?? '',
      navigateDay: (direction) => {
        selectedDay = days[days.indexOf(selectedDay) + direction];
      },
      refresh: async () => {
        refreshCount++;
      },
    },
  );
  function emit(name, x = 200, y = 200, kind = 'meal', count = 1) {
    const event = {
      target: new TouchTarget(kind),
      touches: Array.from({ length: count }, () => ({ clientX: x, clientY: y })),
      cancelable: true,
      preventDefault() {},
    };
    return handlers.get(name)?.(event);
  }
  return {
    service,
    emit,
    detach,
    handlers,
    window,
    selected: () => selectedDay,
    refreshCount: () => refreshCount,
    finishAnimation() {
      const pending = [...timers.values()];
      timers.clear();
      pending.forEach((callback) => callback());
    },
  };
}

test('pull below the original 210px threshold collapses without refreshing', async () => {
  const g = gestures();
  g.emit('touchstart');
  g.emit('touchmove', 200, 409);
  assert.equal(g.service.pull(), 209);
  assert.equal(g.service.ready(), false);
  await g.emit('touchend');
  assert.equal(g.refreshCount(), 0);
  assert.equal(g.service.pull(), 0);
});

test('ready pull refreshes once and resets the indicator', async () => {
  const g = gestures();
  g.emit('touchstart');
  g.emit('touchmove', 200, 450);
  assert.equal(g.service.pull(), 210);
  assert.equal(g.service.ready(), true);
  await g.emit('touchend');
  assert.equal(g.refreshCount(), 1);
  assert.equal(g.service.pull(), 0);
  assert.equal(g.service.ready(), false);
  assert.equal(g.service.refreshing(), false);
});

test('swipe previews and commits the next enabled day, skipping Tuesday', async () => {
  const g = gestures();
  g.emit('touchstart');
  g.emit('touchmove', 80, 200);
  assert.equal(g.service.previewDay(), 'ср');
  assert.equal(g.service.swipeOffset(), -120);
  assert.equal(g.service.pull(), 0);
  await g.emit('touchend');
  assert.equal(g.selected(), 'пн');
  assert.equal(g.service.swipeOffset(), -350);
  g.finishAnimation();
  assert.equal(g.selected(), 'ср');
  assert.equal(g.service.previewDay(), '');
  assert.equal(g.refreshCount(), 0);
});

test('right swipe selects the previous enabled day', async () => {
  const g = gestures({ selected: 'ср' });
  g.emit('touchstart');
  g.emit('touchmove', 300, 200);
  await g.emit('touchend');
  g.finishAnimation();
  assert.equal(g.selected(), 'пн');
});

test('a diagonal start can become a horizontal swipe without refreshing', async () => {
  const g = gestures();
  g.emit('touchstart');
  g.emit('touchmove', 198, 201);
  g.emit('touchmove', 100, 205);
  assert.equal(g.service.pull(), 0);
  assert.equal(g.service.previewDay(), 'ср');
  await g.emit('touchend');
  g.finishAnimation();
  assert.equal(g.selected(), 'ср');
  assert.equal(g.refreshCount(), 0);
});

test('swipes work while the page is scrolled, while pull is disabled there', async () => {
  const g = gestures({ scrollY: 120 });
  g.emit('touchstart');
  g.emit('touchmove', 100, 200);
  await g.emit('touchend');
  g.finishAnimation();
  assert.equal(g.selected(), 'ср');
  assert.equal(g.refreshCount(), 0);
});

test('short swipes snap back without navigation', async () => {
  const g = gestures();
  g.emit('touchstart');
  g.emit('touchmove', 170, 200);
  await g.emit('touchend');
  g.finishAnimation();
  assert.equal(g.selected(), 'пн');
  assert.equal(g.service.swipeOffset(), 0);
  assert.equal(g.service.previewDay(), '');
});

test('last-day boundary resists drag and never navigates', async () => {
  const g = gestures({ selected: 'чт' });
  g.emit('touchstart');
  g.emit('touchmove', 80, 200);
  assert.equal(g.service.previewDay(), '');
  assert.equal(g.service.swipeOffset(), -40);
  await g.emit('touchend');
  g.finishAnimation();
  assert.equal(g.selected(), 'чт');
});

test('upward page scrolling does not refresh or navigate', async () => {
  const g = gestures();
  g.emit('touchstart');
  g.emit('touchmove', 200, 100);
  await g.emit('touchend');
  assert.equal(g.service.pull(), 0);
  assert.equal(g.selected(), 'пн');
  assert.equal(g.refreshCount(), 0);
});

for (const kind of ['dialog', 'select', 'option']) {
  test(kind + ' interaction never triggers refresh or day navigation', async () => {
    const g = gestures();
    g.emit('touchstart', 200, 200, kind);
    g.emit('touchmove', 200, 500, kind);
    await g.emit('touchend', 200, 500, kind);
    assert.equal(g.refreshCount(), 0);
    assert.equal(g.selected(), 'пн');
    assert.equal(g.service.pull(), 0);
  });
}

test('touch cancellation does not refresh a ready pull', async () => {
  const g = gestures();
  g.emit('touchstart');
  g.emit('touchmove', 200, 450);
  g.emit('touchcancel');
  await g.emit('touchend');
  assert.equal(g.refreshCount(), 0);
  assert.equal(g.service.ready(), false);
});

test('multi-touch cancels tracking', async () => {
  const g = gestures();
  g.emit('touchstart');
  g.emit('touchmove', 200, 450, 'meal', 2);
  await g.emit('touchend');
  assert.equal(g.refreshCount(), 0);
  assert.equal(g.service.pull(), 0);
});

test('no selected week means no pull-to-refresh', async () => {
  const g = gestures({ canRefresh: false });
  g.emit('touchstart', 200, 200, 'body');
  g.emit('touchmove', 200, 500, 'body');
  await g.emit('touchend');
  assert.equal(g.refreshCount(), 0);
});

test('detaching removes event listeners and pending animation', async () => {
  const g = gestures();
  g.emit('touchstart');
  g.emit('touchmove', 80, 200);
  await g.emit('touchend');
  g.detach();
  g.finishAnimation();
  assert.equal(g.handlers.size, 0);
  assert.equal(g.selected(), 'пн');
  assert.equal(g.service.previewDay(), '');
});

const names = sourceModule('src/app/models/meal-view.ts');
class TestDate extends Date {
  constructor(...args) {
    super(...(args.length ? args : ['2026-10-27T12:00:00+01:00']));
  }
}

function mealState(dates = ['2026-10-26'], dataByDate = {}) {
  const values = new Map([['selectedEmployee', 'full']]);
  const data = {
    full: {
      пн: ['Омлет / Omelette'],
      вт: ['Омлет / Omelette', null, null, 'Кофе'],
      ср: ['Суп'],
      чт: ['Рис'],
      пт: ['Пятничное блюдо'],
    },
    gap: { пн: ['Омлет'], ср: ['Суп'], чт: ['Рис'] },
    empty: {},
  };
  values.set('sheetDates', JSON.stringify(dates));
  for (const date of dates) {
    values.set('sheetData_' + date, JSON.stringify(dataByDate[date] ?? data));
    values.set(
      'foodInfo_' + date,
      JSON.stringify({ 'Омлет / Omelette': { weight: '200 г', calories: 0, protein: 10 } }),
    );
  }
  const localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  const { StorageService } = sourceModule('src/app/services/storage.service.ts', { localStorage });
  const storage = new StorageService();
  const { MealDataService } = sourceModule(
    'src/app/services/meal-data.service.ts',
    {
      Date: TestDate,
      localStorage,
    },
    {
      './storage.service': {},
      '../models/meal-view': names,
    },
  );
  return new MealDataService(storage);
}

test('employee switch falls forward from disabled Tuesday and backward from Friday', () => {
  const state = mealState();
  state.selectEmployee('gap');
  assert.equal(state.selectedDay(), 'ср');
  state.selectEmployee('full');
  state.selectDay('пт');
  state.selectEmployee('gap');
  assert.equal(state.selectedDay(), 'чт');
});

test('empty employee disables all days and has no selected day or meals', () => {
  const state = mealState();
  state.selectEmployee('empty');
  assert.equal(state.days().length, 0);
  assert.equal(state.selectedDay(), '');
  assert.equal(state.itemsForDay('').length, 0);
});

test('meal presentation keeps original slot indexes, bilingual names and zero nutrition', () => {
  const state = mealState();
  const items = state.itemsForDay('вт');
  assert.equal(items[0].primary, ' Omelette');
  assert.equal(items[0].secondary, 'Омлет ');
  assert.equal(items[0].nutrition[0], '0 ккал');
  assert.equal(items[1].index, 3);
  assert.equal(items[1].icon, '🧋');
});

test('checked meals persist per employee and day and are restored on return', () => {
  const state = mealState();
  state.setEaten(0, true);
  state.selectDay('ср');
  assert.equal(state.itemsForDay('ср')[0].checked, false);
  state.selectEmployee('gap');
  assert.equal(state.itemsForDay('ср')[0].checked, false);
  state.selectEmployee('full');
  state.selectDay('вт');
  assert.equal(state.itemsForDay('вт')[0].checked, true);
});

test('picker days and today warning use the original presentation rules', () => {
  const state = mealState();
  assert.equal(state.employeeDays('gap'), '●○●●○');
  assert.equal(state.employeeIsEmpty('empty'), true);
  assert.equal(state.isToday('вт'), true);
  assert.equal(state.warningForDay('вт'), false);
  assert.equal(state.warningForDay('пт'), true);
});

test('deleting another stored week keeps the current week selected', () => {
  const state = mealState(['2026-10-26', '2026-11-02']);
  state.deleteWeek('2026-11-02');
  assert.equal(state.selectedWeek(), '2026-10-26');
  assert.equal(state.sheets().length, 1);
});

test('a week without the remembered employee does not erase that preference', () => {
  const state = mealState(['2026-10-26', '2026-11-02'], {
    '2026-11-02': { other: { пн: ['Обед'] } },
  });
  state.selectWeek('2026-11-02');
  assert.equal(state.selectedEmployee(), '');
  state.selectWeek('2026-10-26');
  assert.equal(state.selectedEmployee(), 'full');
});

test('deleting the last stored week clears selection and displayed meals', () => {
  const state = mealState();
  state.deleteWeek('2026-10-26');
  assert.equal(state.sheets().length, 0);
  assert.equal(state.selectedWeek(), '');
  assert.equal(state.itemsForDay(state.selectedDay()).length, 0);
});

function mealActions() {
  let copied = '';
  let shared;
  let timer;
  let error = '';
  const { MealActionsComponent } = sourceModule(
    'src/app/components/meal-actions/meal-actions.component.ts',
    {
      navigator: {
        clipboard: {
          writeText: async (text) => {
            copied = text;
          },
        },
        share: async (payload) => {
          shared = payload;
        },
      },
      DOMException,
      setTimeout: (callback) => {
        timer = callback;
        return 1;
      },
      clearTimeout() {},
    },
    {
      '../../services/meal-data.service': { MEAL_ICONS: ['🍳', '1️⃣', '2️⃣', '🧋'] },
    },
  );
  const actions = new MealActionsComponent({
    meals: () => ['Завтрак', null, null, 'Кофе'],
    eaten: () => [0],
    error: {
      set: (value) => {
        error = value;
      },
    },
  });
  actions.day.set('вт');
  return {
    actions,
    copied: () => copied,
    shared: () => shared,
    error: () => error,
    finishFeedback: () => timer(),
  };
}

test('copy keeps the original greeting and slot icon, excludes eaten food, and restores the button', async () => {
  const fixture = mealActions();
  await fixture.actions.copy();
  assert.equal(fixture.copied(), 'Привет! Съешьте пожалуйста мою еду\n\n🧋 Кофе');
  assert.equal(fixture.actions.copyDisabled(), true);
  fixture.finishFeedback();
  assert.equal(fixture.actions.copyDisabled(), false);
  assert.equal(fixture.error(), '');
});

test('share uses the selected weekday and the same uneaten-meal payload', async () => {
  const fixture = mealActions();
  await fixture.actions.share();
  assert.equal(fixture.shared().title, 'Еда за вт');
  assert.equal(fixture.shared().text, 'Привет! Съешьте пожалуйста мою еду\n\n🧋 Кофе');
});
