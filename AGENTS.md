# Repository Guidelines

## Project Structure & Module Organization

This is a standalone Angular application. The entry point is `src/main.ts`; the root UI is `src/app/app.ts` and `src/app/app.html`.

- `src/app/components/`: week, settings, employee, day, meal, and food-info UI.
- `src/app/services/`: persistence, meal view state, sheet import, and touch interactions.
- `src/app/refresh-indicator/`: refresh gesture indicator.
- `src/styles.css`: global style entry point; feature styles are in `src/styles/` and component encapsulation is disabled.
- `public/`: static image assets.

## Build, Test, and Development Commands

Use `npm start` to run the development server and `npm run build` for a production build.

Useful checks:

```powershell
npm run build
```

For Android testing, run the Angular server and forward it over USB with ADB:

```powershell
npm start -- --host 0.0.0.0
adb devices
adb reverse tcp:4200 tcp:4200
```

Open `http://localhost:4200` in Chrome on the connected device. After testing,
remove the forwarding rule with `adb reverse --remove tcp:4200`. USB debugging
must be enabled and the development computer authorized on the device.

## Coding Style & Naming Conventions

Use standalone Angular components and injectable services. Keep component templates declarative, use signals for view state, and prefer `const` unless reassignment is required.

Use descriptive camelCase names (`displaySelectedData`, `getSelectedDate`). Preserve current DOM ids such as `jsonDisplay`, `employeeSelect`, and classes such as `values-list`.

Keep global CSS organized by feature and import it through `src/styles.css`. Keep comments sparse and reserve them for non-obvious parsing, gesture, or browser behavior.

## Testing Guidelines

No automated tests are configured. Use a production build plus manual browser verification. Test:

- Loading stored sheet data from localStorage.
- Selecting employees and enabled/disabled day radios.
- Opening and scrolling the employee picker on Android Chrome, including
  `appearance: base-select` option styling and interaction with pull-to-refresh.
- Day navigation and disabled-day handling.
- Meal checkbox state, copy/share buttons, and refresh gestures.

When adding tests, prefer focused coverage for storage compatibility, sheet parsing, and gesture edge cases.

## Commit & Pull Request Guidelines

Recent commits use short imperative summaries, for example `Adding swipe preview`. Keep messages concise and focused on behavior.

Pull requests should include a brief description, manual test notes, and screenshots or screen recordings for UI/gesture changes. Call out storage changes, new dependencies, and browser compatibility concerns.

## Security & Configuration Tips

The app reads Google Sheet export URLs and stores data in `localStorage`. Do not commit personal sheet links, employee data exports, or generated archives such as `rs-food.zip` unless intentionally distributing a release artifact.
