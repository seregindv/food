import * as dates from './dates.js';
import * as slider from './slider.js';
import * as dropdownButton from './dropdown-button.js';
import { dayNames } from './common.js';

let _refresh;
let _refreshArrow;
let _refreshReady;
let _canCloseSettings = true;
let _settingsVisible = false;

export function showLoading(show) {
    const loader = document.querySelector("#uploadContainer .loader-panel");
    loader.classList.toggle("invisible", !show);
}

export function displayError(message) {
    const errorDisplay = document.getElementById("errorDisplay");
    errorDisplay.textContent = message;
}

export function clearDisplays(refreshing) {
    if (!refreshing) {
        setHidden(document.querySelector(".values-list"), true);
    }
    setHidden(document.getElementById("noData"), true);
    document.getElementById("errorDisplay").textContent = "";
}

export function setToday(day) {
    document.querySelectorAll('input[name="day"]').forEach(
        (e, i) => e.classList.toggle("today", i == day));
}

export function showTitle(show) {
    setHidden(document.getElementById("sheetDates"), !show);
}

export function showSelectors(show) {
    document.getElementById("selectContainer").style.display = show ? "block" : "none";
}

export function populateEmployees(data, selectedEmployee) {
    const employees = Object.keys(data).sort().map(employee => {
        const employeeData = data[employee];
        return {
            name: employee,
            hasMeal: !!Object.keys(employeeData)[0],
            meals: dayNames.map(day => employeeData[day] && '●' || '○').join('')
        }
    });

    const employeeSelect = getEmployeeSelect();
    employeeSelect.innerHTML = '<option value="">Выберите сотрудника</option>';
    employees.forEach(employee => {
        const option = document.createElement("option");
        if (!employee.hasMeal) {
            option.classList.add("empty");
        }
        option.value = employee.name;
        option.textContent = employee.name;
        option.setAttribute('data-days', employee.meals);
        employeeSelect.appendChild(option);
    });
    if (selectedEmployee && employees.some(e => e.name === selectedEmployee)) {
        employeeSelect.value = selectedEmployee;
    }
}

export function getSelectedEmployee() {
    const employeeSelect = getEmployeeSelect();
    return employeeSelect && employeeSelect.value;
}

export function getMeals(display = document.getElementById("jsonDisplay")) {
    return {
        display,
        show: function (show) {
            setHidden(display.querySelector(".values-list"), !show);
        },
        setNames: function (getName, getInfo) {
            let i = 0;
            let hasFoodInfo = false;
            for (const mealElement of display.querySelectorAll(".meal")) {
                const meal = getName(i);
                setMealName(mealElement.querySelector(".meal-name"), meal);
                mealElement.foodInfo = meal && getInfo ? getInfo(meal) : null;
                mealElement.foodName = meal;
                hasFoodInfo ||= !!mealElement.foodInfo;

                const weight = mealElement.querySelector(".meal-weight");
                weight.textContent = mealElement.foodInfo?.weight == null
                    ? ""
                    : `${mealElement.foodInfo.weight} г`;
                setHidden(weight, !weight.textContent);

                const nutrition = mealElement.querySelector(".meal-nutrition");
                const nutritionValues = mealElement.foodInfo && [
                    [mealElement.foodInfo.calories, "ккал"],
                    [mealElement.foodInfo.protein, "г"],
                    [mealElement.foodInfo.fat, "г"],
                    [mealElement.foodInfo.carbs, "г"],
                ];
                const hasMealNutrition = nutritionValues
                    && nutritionValues.some(([value]) => value != null);
                if (hasMealNutrition) {
                    nutrition.querySelectorAll("div").forEach((cell, index) => {
                        const [value, unit] = nutritionValues[index];
                        cell.textContent = value == null ? "" : `${value} ${unit}`;
                    });
                }
                setHidden(nutrition, !hasMealNutrition);
                setHidden(mealElement, !meal);
                ++i;
            }
            setHidden(getFoodInfoButton(display), !hasFoodInfo);
        }
    }
}

export function setStatus(message) {
    const element = getStatusElement();
    setHidden(element, !message);
    element.innerText = message || null;
}

export function setStatusVisibility(visible) {
    setHidden(getStatusElement(), !visible);
}

export function getSelectedDay() {
    let i = 0;
    for (const day of document.querySelectorAll('input[name="day"]')) {
        if (day.checked) {
            return { index: i, name: day.value };
        }
        ++i;
    }
    return { index: -1, name: null };
}

export function checkMeals(indexes, display = document) {
    const indexSet = new Set(indexes);
    display.querySelectorAll('input[name="meal"]').forEach((e, i) => e.checked = indexSet.has(i));
}

export function onUpload(action) {
    document.getElementById("uploadForm").addEventListener("submit", e => {
        e.preventDefault();
        const sheetLink = document.getElementById("sheetLinkInput").value.trim();
        action(sheetLink);
    });
}

export function onAddSheet(action) {
    const button = document.getElementById("addBtn");
    button.addEventListener("click", e => {
        e.preventDefault();
        const sheetLink = document.getElementById("sheetLinkInput").value.trim();
        action(sheetLink);
    });
}

export function onAddMenu(action) {
    const button = document.getElementById("addMenuBtn");
    button.addEventListener("click", e => {
        e.preventDefault();
        const sheetLink = document.getElementById("sheetLinkInput").value.trim();
        action(sheetLink);
    });
}

export function onAddToDay(action) {
    const button = document.getElementById("addToDayBtn");
    button.addEventListener("click", e => {
        e.preventDefault();
        const sheetLink = document.getElementById("sheetLinkInput").value.trim();
        action(sheetLink);
    });
}

export function setupDropdownButtons() {
    dropdownButton.init(document.getElementById("uploadDropdown"));
}

export function chooseDays(dayNames, { multiple = true, title = "Добавить дни" } = {}) {
    const dialog = document.getElementById("addDaysDialog");
    const choices = document.getElementById("addDaysChoices");
    dialog.querySelector("h3").textContent = title;
    choices.innerHTML = "";
    for (const dayName of dayNames) {
        const label = document.createElement("label");
        const checkbox = document.createElement("input");
        checkbox.type = multiple ? "checkbox" : "radio";
        if (!multiple) {
            checkbox.name = "add-day";
        }
        checkbox.value = dayName;
        label.append(checkbox, ` ${dayName}`);
        choices.appendChild(label);
    }

    return new Promise(resolve => {
        dialog.addEventListener("close", () => {
            const selectedDays = Array.from(choices.querySelectorAll("input:checked"), input => input.value);
            resolve(dialog.returnValue === "confirm" ? selectedDays : null);
        }, { once: true });
        dialog.showModal();
    });
}

export function renderLoadedSheets(sheets) {
    const loadedSheets = document.getElementById("loadedSheets");
    loadedSheets.innerHTML = "";
    for (const sheet of sheets) {
        const row = document.createElement("div");

        const priorityClass = dates.getPriorityClass(sheet.date);
        const mainLink = createSheetLink(sheet.link, formatSheetDate(sheet.date), priorityClass);
        row.appendChild(mainLink);
        for (const addition of sheet.additions) {
            row.appendChild(createSheetLink(addition.link, addition.days, priorityClass));
        }

        const deleteCell = document.createElement("div");
        const button = document.createElement("button");
        button.type = "button";
        button.className = "sheet-delete";
        button.dataset.date = sheet.date;
        button.textContent = "+";
        button.setAttribute("aria-label", `Удалить ${mainLink.textContent}`);
        deleteCell.appendChild(button);
        row.appendChild(deleteCell);

        loadedSheets.appendChild(row);
    }
}

function createSheetLink(href, text, className) {
    const link = document.createElement("a");
    link.href = href;
    link.textContent = text;
    link.target = "_blank";
    link.rel = "noopener";
    link.className = className;
    return link;
}

export function onDeleteSheet(action) {
    document.getElementById("loadedSheets").addEventListener("click", e => {
        const button = e.target.closest(".sheet-delete");
        if (button) {
            action(button.dataset.date);
        }
    });
}

export function onEmployeeChanged(action) {
    const employeeSelect = document.getElementById("employeeSelect");
    employeeSelect.addEventListener("change", () => action(employeeSelect.value));
}

export function onDayChanged(action) {
    const days = document.querySelectorAll('input[name="day"]');
    days.forEach(e => e.addEventListener("change", () => action()));
}

export function setupDaySwipe({ onPreview, onSlideStart } = {}) {
    const display = document.getElementById("jsonDisplay");
    slider.init({
        element: display,
        canSlide: direction => getEnabledDay(direction) !== null,
        onPreview: (direction, preview) => {
            const day = getEnabledDay(direction);
            if (day) {
                onPreview && onPreview({ index: getDayIndex(day), name: day.value, display: preview });
            }
        },
        onSlideStart: direction => {
            const day = getEnabledDay(direction);
            if (day) {
                onSlideStart && onSlideStart({ index: getDayIndex(day), name: day.value });
            }
        },
        onSlide: direction => selectEnabledDay(direction)
    });
}

export function onMealCheckChanged(action) {
    document.querySelectorAll('input[name="meal"]').forEach(e => e.addEventListener("change", e => {
        const id = /(\d+)$/.exec(e.target.id);
        if (!id) {
            return;
        }
        const index = id[1] - 1;
        const checked = e.target.checked;
        action({ index, checked });
    }));
}

export function onLoaded(action) {
    window.addEventListener("DOMContentLoaded", () => action());
}

export function initDates(sheetDates, onChange) {
    dates.render({
        element: document.getElementById('sheetDates'),
        template: document.getElementById('sheetDate'),
        onChange
    });
    dates.setDates(sheetDates);
}

export function selectDefaultDate() {
    dates.selectDefault();
}

export function setDates(sheetDates) {
    dates.setDates(sheetDates);
}

export function selectDate(dateString) {
    dates.select(dateString);
}

export function getSelectedDate() {
    return dates.getSelectedDate();
}

export function getSelectedDateStatus() {
    return dates.getSelectedDateStatus();
}

export function onRefreshMove(e) {
    const refreshArrow = getRefreshArrow();
    if (e.ready !== _refreshReady) {
        _refreshReady = e.ready;
        refreshArrow.classList.toggle('ready', _refreshReady);
    }
    const turn = _refreshReady ? 0 : (.5 * (1 - e.swipe / e.threshold));
    refreshArrow.style.transform = `rotate(${turn}turn)`;
    _refresh.style.height = e.swipe / 3 + 'px';
}

export function updateRefreshStatus() {
    const refreshArrow = getRefreshArrow();
    const status = dates.getSelectedDateStatus();
    dates.setPriorityClass(refreshArrow, status);
}

export function setupSettingsActions() {
    document.getElementById("showSettings").addEventListener("click", e => {
        showSettings(_settingsVisible ? false : true);
    });
}

export function showSettings(show, canClose = true) {
    _settingsVisible = show;
    document.getElementById("settings").classList.toggle("hidden", !show);
    document.querySelector("#showSettings div").classList.toggle("rotated", show);
    canCloseSettings(canClose);
}

export function canCloseSettings(value) {
    if (value == _canCloseSettings) {
        return;
    }
    document.getElementById("showSettings").disabled = !value;
    _canCloseSettings = value;
}

export function onCopyEatIt(e) {
    document.getElementById("copyEatIt").addEventListener("click", e.action);
}

export function onShareEatIt(e) {
    const button = document.getElementById("shareEatIt");
    if (navigator.share) {
        button.addEventListener("click", e.action);
    } else {
        button.classList.add("hidden");
    }
}

export function setupMealIcons(icons) {
    const loaderIcons = document.querySelectorAll(".loader-panel .loader");
    for (const icon of icons) {
        const span = document.createElement("span");
        span.textContent = icon;
        loaderIcons.forEach(loaderIcon => loaderIcon.appendChild(span));
    }

    const mealTemplate = document.getElementById("meal-template");
    const meals = document.querySelector(".meals");
    for (let i = 0; i < icons.length; ++i) {
        const mealId = `meal${i + 1}`;
        const meal = mealTemplate.content.cloneNode(true);

        const input = meal.getElementById('meal1');
        input.id = mealId;
        input.setAttribute("icon", icons[i]);

        const label = meal.querySelector('label');
        label.htmlFor = mealId;

        meals.appendChild(meal);
    }
}

export function setupFoodInfo() {
    const button = document.getElementById("foodInfoButton");
    button.addEventListener("click", () => {
        const meals = Array.from(document.querySelectorAll("#jsonDisplay .meals .meal"), meal => {
            return {
                name: meal.foodName,
                info: meal.foodInfo,
                icon: meal.querySelector('input[name="meal"]').getAttribute("icon"),
            };
        }).filter(meal => meal.info);
        showFoodInfo(meals);
    });

    const dialog = document.getElementById("foodInfoDialog");
    dialog.addEventListener("click", event => {
        const bounds = dialog.getBoundingClientRect();
        const outside = event.clientX < bounds.left || event.clientX > bounds.right
            || event.clientY < bounds.top || event.clientY > bounds.bottom;
        if (outside) {
            dialog.close();
        }
    });
}

function showFoodInfo(meals) {
    const dialog = document.getElementById("foodInfoDialog");
    const nav = document.getElementById("foodInfoNav");
    const details = document.getElementById("foodInfoDetails");
    nav.replaceChildren();
    details.replaceChildren();

    for (const meal of meals) {
        const id = `foodInfo${meal.icon}`;
        const navButton = document.createElement("button");
        navButton.type = "button";
        navButton.textContent = meal.icon;
        navButton.setAttribute("aria-label", meal.name);
        navButton.addEventListener("click", () => scrollToFoodInfo(id, true));
        nav.appendChild(navButton);

        const section = document.createElement("section");
        section.id = id;
        section.className = "food-info-meal";
        const heading = document.createElement("div");
        heading.className = "food-info-meal-heading";
        const icon = document.createElement("span");
        icon.className = "food-info-meal-icon";
        icon.textContent = meal.icon;
        const title = document.createElement("div");
        title.className = "meal-name food-info-meal-name";
        const primaryName = document.createElement("div");
        primaryName.className = "meal-name-primary";
        const secondaryName = document.createElement("div");
        secondaryName.className = "meal-name-secondary";
        title.append(primaryName, secondaryName);
        setMealName(title, meal.name);
        heading.append(icon, title);
        section.appendChild(heading);
        appendFoodInfo(section, meal.info);
        details.appendChild(section);
    }
    dialog.showModal();
    details.scrollTop = 0;
}

function appendFoodInfo(details, info) {
    if (info.allergens || info.vegeterian) {
        const flags = document.createElement("div");
        flags.className = "food-info-flags";
        const allergens = document.createElement("p");
        allergens.textContent = info.allergens ? `❗${info.allergens}` : "";
        const vegetarian = document.createElement("p");
        vegetarian.textContent = info.vegeterian ? "🌱 вегетарианское" : "";
        flags.append(allergens, vegetarian);
        details.appendChild(flags);
    }
    if (info.infoRS || info.infoRU) {
        const composition = document.createElement("section");
        composition.className = "food-info-composition";
        for (const text of [info.infoRS, info.infoRU]) {
            if (text) {
                const paragraph = document.createElement("p");
                paragraph.textContent = text;
                composition.appendChild(paragraph);
            }
        }
        details.appendChild(composition);
    }

    const grid = document.createElement("div");
    grid.className = "food-info-grid";
    const fields = [
        ["Вес", info.weight, " г"],
        ["Цена", info.price, " дин"],
        ["Калории", info.calories, " ккал"],
        ["Белки", info.protein, " г"],
        ["Жиры", info.fat, " г"],
        ["Углеводы", info.carbs, " г"],
    ];
    let hasFields = false;
    for (const [label, value, suffix = ""] of fields) {
        const field = document.createElement("div");
        field.className = "food-info-field";
        const fieldLabel = document.createElement("div");
        fieldLabel.className = "food-info-label";
        fieldLabel.textContent = label;
        const fieldValue = document.createElement("div");
        fieldValue.textContent = value == null || value === "" ? "" : `${value}${suffix}`;
        if (!fieldValue.textContent) {
            field.classList.add("missing");
        } else {
            hasFields = true;
        }
        field.append(fieldLabel, fieldValue);
        grid.appendChild(field);
    }
    if (hasFields) {
        details.appendChild(grid);
    }
}

function scrollToFoodInfo(id, smooth) {
    const content = document.getElementById("foodInfoDetails");
    const section = document.getElementById(id);
    if (section) {
        content.scrollTo({ top: section.offsetTop, behavior: smooth ? "smooth" : "auto" });
    }
}

function setMealName(element, meal) {
    const names = meal?.split(/(?<=[\s+\p{Script=Cyrillic}])[\/\\](?=[\s+\p{Script=Latin}])/u) || [];
    element.querySelector(".meal-name-primary").innerText = names[1] || names[0] || null;
    element.querySelector(".meal-name-secondary").innerText = names[1] && names[0] || null;
}

export function disableCopyEatIt() {
    const copyEatIt = document.getElementById("copyEatIt")
    copyEatIt.disabled = true;
    setTimeout(() => {
        copyEatIt.disabled = false;
    }, 2000);
}

export function ensureRefreshLoader() {
    const refreshLoader = document.querySelector('.refresh-loader');
    if (refreshLoader.querySelector('.loader')) {
        return;
    }
    const refresh = document.querySelector('.loader-panel');
    const cloned = refresh.cloneNode(true);
    cloned.classList.remove('invisible');
    refreshLoader.appendChild(cloned);
}

export function showRefreshLoading() {
    document.querySelector('.refresh-arrow').classList.add('hidden');
    document.querySelector('.refresh-loader').classList.remove('hidden');
}

export function showRefreshArrow() {
    document.querySelector('.refresh-arrow').classList.remove('hidden');
    document.querySelector('.refresh-loader').classList.add('hidden');
}

export function setShareWarning(value, display) {
    getShareButton("shareEatIt", display).classList.toggle("warning", value);
    getShareButton("copyEatIt", display).classList.toggle("warning", value);
}

export function changeMascot(oldMascot, newMascot) {
    const mascotElement = document.querySelector(".mascot");
    if (oldMascot) {
        mascotElement.classList.remove(oldMascot.name);
    }
    mascotElement.classList.add(newMascot.name);
    mascotElement.querySelector("img").src = newMascot.fileName;
}

export function onChangeMascot(e) {
    const mascotImage = document.querySelector(".mascot img");
    mascotImage.addEventListener("click", () => e.changeMascot());
}

function getMascot() {
    return _defaultMascot ? "cake" : "donkey";
}

function selectEnabledDay(direction) {
    const day = getEnabledDay(direction);
    if (!day) {
        return false;
    }

    day.checked = true;
    day.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
}

function getEnabledDay(direction) {
    const days = Array.from(document.querySelectorAll('input[name="day"]'));
    const selectedIndex = days.findIndex(day => day.checked);
    if (selectedIndex === -1) {
        return null;
    }

    for (let i = selectedIndex + direction; i >= 0 && i < days.length; i += direction) {
        const day = days[i];
        if (!day.disabled) {
            return day;
        }
    }

    return null;
}

function getDayIndex(day) {
    return Array.from(document.querySelectorAll('input[name="day"]')).indexOf(day);
}

function formatSheetDate(date) {
    const [year, month, day] = date.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long'
    });
}

function getRefreshArrow() {
    if (!_refresh) {
        _refresh = document.querySelector('.refresh');
    }
    if (!_refreshArrow) {
        _refreshArrow = _refresh.querySelector('.refresh-arrow');
    }
    return _refreshArrow;
}

function setHidden(element, value) {
    element.classList.toggle("hidden", value);
}

function getStatusElement() {
    return document.getElementById("noData");
}

function getEmployeeSelect() {
    return document.getElementById("employeeSelect");
}

function getShareButton(id, display) {
    return !display
        ? document.getElementById(id)
        : display.querySelector(`[data-source-id="${id}"]`);
}

function getFoodInfoButton(display) {
    return display.querySelector('#foodInfoButton, [data-source-id="foodInfoButton"]');
}
