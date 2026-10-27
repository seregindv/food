# RsFood

RsFood is a standalone Angular app for viewing and sharing weekly meal schedules.

## Development

Install dependencies with `npm install`, then run `npm start` and open `http://localhost:4200/`.
Create a production build with `npm run build`; output is written to `dist/rs-food/browser`.

## Structure

- `src/app/app.ts` and `app.html`: root layout and gesture coordination.
- `src/app/components/`: week selector, sheet settings/actions, employee and day selectors, meal list/actions, and food info dialog.
- `src/app/services/`: persistence, meal state, spreadsheet import, and device interaction.
- `src/app/refresh-indicator/`: pull-to-refresh indicator UI.
- `src/app/services/workbook-parser.service.ts`: workbook and menu parsing, with XLSX loaded on demand.
- `src/styles.css`: global stylesheet entry point. Feature styles live in `src/styles/`.
- `public/`: images and other static assets.

The app keeps the existing localStorage keys (`sheetDates`, `sheetData_*`, `sheetLink_*`, `foodInfo_*`, `eaten_*`, and `mascot`) so saved schedules remain available.

## Android manual check

Run `npm start -- --host 0.0.0.0`, then forward the port over USB with `adb reverse tcp:4200 tcp:4200` and open `http://localhost:4200/` in Chrome. Check employee/day selection, meal checkboxes, sheet import, refresh gesture, and copy/share actions.
