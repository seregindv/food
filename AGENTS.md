# Repository Guidelines

## Project Structure & Module Organization

This is a static vanilla JavaScript app. The entry point is `index.html`, with global styling in `index.css` and radio/meal control styling in `radio.css`.

JavaScript modules live in `js/`:

- `js/index.js`: app startup, data loading, rendering decisions, sharing/copy actions.
- `js/page.js`: DOM-facing UI helpers and event wiring.
- `js/slider.js` and `js/refresh.js`: touch gesture behavior.
- `js/storage.js`: localStorage access.
- `js/dates.js`, `js/common.js`, `js/mascot.js`: focused helper modules.

Root image assets (`cake.png`, `donkey.png`, `excel.svg`, `fridge.svg`) are loaded directly by the page. There is no test directory.

## Build, Test, and Development Commands

There is no build step and no package manager configuration. Open `index.html` in a browser to run the app.

Useful checks:

```powershell
node --check js\index.js
node --check js\page.js
node --check js\slider.js
```

These validate syntax only. Run them for any changed module. If tooling is added later, document it here and keep normal static usage simple.

## Coding Style & Naming Conventions

Use ES modules and keep functions small and module-local. Existing code uses 2-space indentation in `js/index.js` and 4-space indentation in several helper modules; match the file you edit. Prefer `const` unless reassignment is required.

Use descriptive camelCase names (`displaySelectedData`, `getSelectedDate`). Preserve current DOM ids such as `jsonDisplay`, `employeeSelect`, and classes such as `values-list`.

Keep comments sparse. Add them only for non-obvious parsing, gesture, or browser behavior.

## Testing Guidelines

No automated tests are configured. Combine syntax checks with manual browser verification. Test:

- Loading stored sheet data from localStorage.
- Selecting employees and enabled/disabled day radios.
- Swiping `#jsonDisplay` left/right, including disabled-day skips.
- Meal checkbox state, copy/share buttons, and refresh gestures.

When adding tests, prefer focused coverage for helpers in `js/common.js`, `js/storage.js`, and gesture edge cases in `js/slider.js`.

## Commit & Pull Request Guidelines

Recent commits use short imperative summaries, for example `Adding swipe preview`. Keep messages concise and focused on behavior.

Pull requests should include a brief description, manual test notes, and screenshots or screen recordings for UI/gesture changes. Call out storage changes, new dependencies, and browser compatibility concerns.

## Security & Configuration Tips

The app reads Google Sheet export URLs and stores data in `localStorage`. Do not commit personal sheet links, employee data exports, or generated archives such as `rs-food.zip` unless intentionally distributing a release artifact.
