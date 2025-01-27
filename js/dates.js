import { getDateString } from './common.js';

let _element;
let _dates;
let _template;
let _onChange;
const _formatter = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short' });

export const sheetPriority = {
    normal: 1,
    early: 2,
    late: 3
};

export function render({ element, template, dates, onChange }) {
    _element = element;
    _template = template;
    _onChange = onChange;
    element.innerHTML = "";
    let i = 1;
    for (var date of dates.sort()) {
        const templateClone = template.clone();
        const input = templateClone.querySelector("input");
        const label = templateClone.querySelector("label");
        const id = `date${i}`;
        label.for = id;
        input.id = id;
        input.name = "date";
        input.value = date;
        label.innerHTML = _formatter.format(new Date(date));

        const today = new Date();
        let monday = getMonday(today);
        let nextMonday = new Date(monday);
        nextMonday = new Date(nextMonday.setDate(nextMonday.getDate() + 7));
        monday = getDateString(monday);
        nextMonday = getDateString(nextMonday);

        const priority = date < monday ? sheetPriority.late
            : date >= nextMonday ? sheetPriority.early : sheetPriority.normal;
        templateClone.classList.add(priorityToClass(priority));

        _dates.push({ date, priority });
        element.appendChild(templateClone);
        ++i;
    }
    const elements = element.querySelectorAll('input');
    elements.forEach(e => e.addEventListener("change", e => onChange(e.target.value)));
}

export function selectDefault() {
    let selectedData;
    for (const data of _dates) {
        if (data.status === sheetPriority.normal) {
            selectedData = data;
            break;
        }
        if (!selectedData) {
            selectedData = data;
            continue;
        }
        if (data.priority < selectedData.priority) {
            selectedData = data;
        }
    }
    if (!selectedData) {
        return;
    }
    select(selectedData.date);
}

export function setDates(dates) {
    // TODO
}

export function select(dateString) {
    const input = _element.querySelector(`input[value${dateString}]`);
    if (!input) {
        return;
    }
    input.checked = true;
    _onChange(input.value);
}

function getMonday(date) {
    date = new Date(date);
    const day = date.getDay(),
        diff = date.getDate() - day + (day == 0 ? -6 : 1);
    return new Date(date.setDate(diff));
}

function priorityToClass(priority) {
    switch (priority) {
        case sheetPriority.normal: return 'normal';
        case sheetPriority.early: return 'early';
        case sheetPriority.late: return 'late';
    }
}