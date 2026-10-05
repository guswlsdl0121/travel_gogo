const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function parseLocalDate(date) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatShortDate(date) {
  const value = parseLocalDate(date);
  return `${String(value.getMonth() + 1).padStart(2, "0")}.${String(value.getDate()).padStart(2, "0")}`;
}

export function formatFullDate(date) {
  const value = parseLocalDate(date);
  return `${value.getMonth() + 1}월 ${value.getDate()}일 ${WEEKDAYS[value.getDay()]}요일`;
}

export function formatPeriod(startDate, endDate) {
  return `${formatShortDate(startDate)} — ${formatShortDate(endDate)}`;
}
