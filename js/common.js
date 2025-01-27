export function getDateString(date) {
  return date.toLocaleDateString('en-CA');
}

export function getMonday() {
    const date = new Date();
    const day = date.getDay(),
        diff = date.getDate() - day + (day == 0 ? -6 : 1);
    return new Date(date.setDate(diff));
}
