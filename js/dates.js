import { getDateString, getMonday, getMonthName } from './common.js';

let _element;
let _dates;
let _template;
let _onChange;
let _selectedDate;

export const sheetPriority = {
    normal: 1,
    early: 2,
    late: 3
};

export function render({ element, template, onChange }) {
    _element = element;
    _template = template;
    _onChange = onChange;
}

export function selectDefault() {
    let selectedData;
    for (const data of _dates) {
        if (data.priority === sheetPriority.normal) {
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
    select(selectedData?.date);
}

export function setDates(dates) {
    let i = 0;
    const elements = _element.querySelectorAll('.sheet-date');
    _dates = [];
    if (dates) {
        for (var date of dates.sort()) {
            let element = elements[i];
            const append = !element;
            if (append) {
                const template = _template.content.cloneNode(true);
                element = template.querySelector(".sheet-date");
                element.addEventListener("change", e => onChange(e));
            }

            const input = element.querySelector("input");
            const label = element.querySelector("label");
            const header = element.querySelector(".header");
            const content = element.querySelector(".content");
            const id = `date${i + 1}`;
            label.htmlFor = id;
            input.id = id;
            input.name = "date";
            input.value = date;
            header.innerHTML = getMonthName(date);
            content.innerHTML = new Date(date).getDate();

            const priority = getPriority(date);
            setPriorityClass(element, priorityToClass(priority), append);

            _dates.push({ date, priority });
            if (append) {
                _element.appendChild(element);
            } else {
                element.classList.remove('hidden');
            }
            ++i;
        }
    }

    for (; i < elements.length; i++) {
        elements[i].classList.add('hidden');
    }
}

export function select(dateString) {
    const input = _element.querySelector(`input[value="${dateString}"]`);
    if (input) {
        input.checked = true;
        _selectedDate = dateString;
    } else {
        _selectedDate = null;
    }
    _onChange(input?.value);
}

export function getSelectedDate() {
    return _selectedDate;
}

export function getSelectedDateStatus() {
    if (!_dates || !_selectedDate) {
        return null;
    }
    const priority = _dates.find(d => d.date === _selectedDate)?.priority;
    if (!priority) {
        return null;
    }
    return priorityToClass(priority);
}

export function getPriorityClass(date) {
    return priorityToClass(getPriority(date));
}

export function setPriorityClass(element, priority, newElement) {
    if (!newElement) {
        element.classList.remove(priorityToClass(1));
        element.classList.remove(priorityToClass(2));
        element.classList.remove(priorityToClass(3));
    }
    element.classList.add(priority);
}

function getPriority(date) {
    let monday = getMonday();
    let nextMonday = new Date(monday);
    nextMonday = new Date(nextMonday.setDate(nextMonday.getDate() + 7));
    monday = getDateString(monday);
    nextMonday = getDateString(nextMonday);

    return date < monday ? sheetPriority.late
        : date >= nextMonday ? sheetPriority.early : sheetPriority.normal;
}

function priorityToClass(priority) {
    switch (priority) {
        case sheetPriority.normal: return 'normal';
        case sheetPriority.early: return 'early';
        case sheetPriority.late: return 'late';
    }
}

function onChange(e) {
    _selectedDate = e.target.value;
    _onChange(_selectedDate);
}
