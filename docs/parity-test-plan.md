# Original-to-Angular parity test plan

Baseline: master d79f846, 27 October 2026, Europe/Budapest.
Preview: http://localhost:4200/. Compare at 1280x900 and 390x844.
Private sheet URLs, employee names and exported data stay out of repository files.
Use the primary and Friday-addition sheets supplied in the task.

## Setup and repeatability

1. Serve master with a static HTTP server.
2. Use `Загрузить` for the primary sheet. Expect the week of 26 October.
3. Use `Добавить в день...` for the second sheet; choose `Пт` and confirm. Expect a `+пт` chip. The second sheet has no day headers: `Добавить дни...` rejects it with `Не удалось найти дни с едой`.
4. Choose a representative employee with all five weekdays after the addition. Choose an employee missing Tuesday and Friday for disabled-day checks, and an empty employee for the empty state.
5. Save screenshots and DOM observations for identical employees, weekdays, viewport sizes, settings state and checkbox state. Evidence contains private test data and remains outside the repository.
6. Before re-importing in Angular, reload Angular against the same origin to check compatibility with master's saved data.
7. Repeat both imports through Angular's UI, then repeat the same cases.

## Test matrix

| ID  | Actions and expected baseline                                                                                                                                         | Master execution                                                                        |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| T01 | Empty startup: mascot, employee placeholder, settings open and gear disabled; no day or meal content                                                                  | Observed before import                                                                  |
| T02 | Primary upload: loader appears, week date card and localized `26 октября` chip appear; employee list populates                                                        | Pass                                                                                    |
| T03 | Friday addition: radio chooser has five weekdays, confirm adds `+пт`; Friday meals differ from Mon-Thu                                                                | Pass                                                                                    |
| T04 | Reload retains primary data, Friday addition and selected employee                                                                                                    | Pass                                                                                    |
| T05 | Settings: gear rotates; toggling preserves the entered link; collapsed split upload button; menu closes on choice/outside click                                       | Structure and choice behavior observed; outside click and long press pending            |
| T06 | Picker: alphabetic options, five availability dots, empty options gray, list scrolls without refreshing page                                                          | DOM and narrow screenshot recorded; touch interaction pending                           |
| T07 | Mon-Fri: title-case labels; Tuesday today outline; checked day blue; representative meal counts 5/5/6/6/5                                                             | Pass; five mobile DOM/screenshot captures                                               |
| T08 | Employee missing Tuesday/Friday: Tuesday selection falls forward to Wednesday; Friday selection falls back to Thursday; disabled labels gray                          | Pass                                                                                    |
| T09 | Empty employee and placeholder: no checked weekday or meals; day controls disabled                                                                                    | Empty employee observed; placeholder source inspected                                   |
| T10 | Meal presentation: correct slot emoji, bilingual split if present, weight aligned right, four colored nutrition cells; Friday has no unavailable nutrition/info       | Screenshots and DOM recorded                                                            |
| T11 | Check a meal: text and nutrition dim/strike through; reload restores checked state; other employee/day unaffected                                                     | Persistence observed; isolation included in Angular repeat                              |
| T12 | Copy: excludes eaten meals, uses original icons and greeting, button disables for two seconds; non-today actions are red                                              | Disabled feedback observed; exposed clipboard read returned empty, payload not verified |
| T13 | Share: original SVG, visible only when supported; open and cancel system sheet, never send to a recipient                                                             | Appearance/source inspected; native share sheet pending                                 |
| T14 | Food info: one action for whole day; modal navigation icons, composition, allergens, weight, calories/macros, shelf life; scrolling nav jumps and close restores page | Pass; desktop/mobile dialog captures                                                    |
| T15 | Form validation: empty link `Пожалуйста, введите ссылку`; bad link `Неверная ссылка на Google-таблицу`; loader resets after errors                                    | Both validation errors observed                                                         |
| T16 | Add-days/add-menu paths: cancel makes no changes; replace only chosen days; append only chosen day; menu data merges                                                  | Friday append observed; broader mutations pending                                       |
| T17 | Mascot toggles cake/donkey and survives reload                                                                                                                        | Pass                                                                                    |
| T18 | Delete test import: selected week falls back appropriately, last deletion opens settings, other weeks untouched                                                       | Pending; use only disposable test imports                                               |
| T19 | Touch pull below 210px: arrow rotates and collapses, no download; at threshold: themed ready arrow, release loads primary+additions and keeps checks                  | Source inspected; real touch execution blocked by unavailable API                       |
| T20 | Touch swipe over meals: adjacent-day preview, 60px commit, 180ms transition, skip disabled days, boundary resistance and snap-back, checked state per day             | Source inspected; real touch execution blocked by unavailable API                       |
| T21 | Gesture exclusions: dialog/picker scroll and vertical page scroll do not refresh or navigate days; no pull when page scrolled or no week                              | Source inspected; real touch execution pending                                          |
| T22 | Desktop/narrow layout: 460px maximum main width, 20px side padding, no horizontal page overflow, identical action placement and modal sizes                           | Pass on recorded representative states                                                  |

## Evidence

`master/` contains screenshots and DOM-derived JSON for desktop Tuesday/Friday, all five weekdays at 390px, empty and gap employees, picker, settings, and food dialog. The checked first Tuesday meal is intentional and persisted for the Angular storage-compatibility check.

## Input-mode limitation

The exposed in-app browser API provides viewport sizing and mouse/keyboard input. At the time of baseline collection `ontouchstart in window` and `(pointer: coarse)` were false. Enabling Developer mode and reconnecting did not expose CDP commands in this session. Narrow screenshots are layout checks; they are not passed touch-gesture tests.

## Angular results

The Angular comparison starts from commit 9d7b46e plus the working changes.
Master source was left unchanged.

- Repeated both supplied imports through Angular's UI. The primary week and the Friday `+пт` addition loaded successfully.
- Verified compatibility with master's stored schedule, remembered employee and checked Tuesday meal before re-importing.
- Compared all five weekdays: names, original meal-slot icons, weights, four nutrition cells, checked state, day availability and today markers matched the master DOM observations. Representative meal counts remained 5/5/6/6/5.
- All 54 picker options matched, including names, empty styling and availability dots.
- Confirmed the Tuesday-to-Wednesday fallback for an employee without Tuesday meals, plus all-disabled controls and no meals for an empty employee.
- Compared complete layout bounds at 1280x900 and 390x1000 with the same selected employee, Tuesday and checkbox state: no differences in the measured header, picker, day controls, meal rows, weights, nutrition or action buttons.
- Compared settings layout bounds: localized sheet chips, rotated delete control, full-width input, split button, invisible loader space and day-control positions matched.
- Visually inspected paired master/Angular screenshots. Complete narrow and desktop captures are saved outside the repository.
- Food-dialog text matched after whitespace normalization. Navigation icons, section layout, composition, allergens, shelf life, scroll navigation and backdrop close were checked.
- Empty and invalid link errors matched master. Settings toggling retained the input. Friday chooser autofocus, cancel behavior and outside-click menu dismissal were checked.
- Observed Angular copy feedback and checked-state persistence after reload. Clipboard payload and share payload are covered by service tests; the exposed browser clipboard reader returned empty for master as well, so this is not an end-to-end clipboard assertion.

## Automated checks

Run `npm run test:parity`. The 26 checks load the actual TypeScript services/components with small Angular, DOM/event and browser-API substitutes. They cover:

- 210px refresh threshold, single refresh, reset and unavailable-week behavior.
- Adjacent enabled-day preview and commit, previous-day navigation, diagonal starts, short-swipe snap-back, boundary resistance and swipes while scrolled.
- Dialog, picker, multi-touch and touch-cancel exclusions; listener/timer cleanup.
- Disabled-day fallback, empty employees, bilingual names, nutrition zero values and original meal-slot indexes.
- Real StorageService serialization with synthetic data, checked-state isolation, deleting the current/another week, and preserving the remembered employee across weeks.
- Copy/share greeting, icon, selected-day title, eaten-meal exclusion and copy-button feedback reset.

These tests exercise application logic rather than a real browser touch stack.

## Remaining manual checks

T19-T21 still need real touch execution: pull-to-refresh, the visual swipe preview/animation and interactions with a scrolling native picker or dialog. Desktop pointer input and a narrow viewport do not validate these.

Also pending are the native OS share-sheet cancellation flow, real clipboard payload inspection and the broader replacement/menu-import mutation matrix beyond the supplied Friday append. Week deletion is covered with synthetic StorageService fixtures so the imported browser data is retained.

For Android: run `npm start -- --host 0.0.0.0`, use `adb reverse tcp:4200 tcp:4200`, and open `http://localhost:4200/` in Chrome. Repeat T19-T21, then remove forwarding with `adb reverse --remove tcp:4200`.
