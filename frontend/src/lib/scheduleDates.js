export function toDateInputValue(value) {
  return value ? String(value).slice(0, 10) : "";
}

export function toStartOfDayDateTime(dateValue) {
  return dateValue ? `${dateValue}T00:00:00` : "";
}

export function formatScheduleDate(value, options = {}) {
  if (!value) return "";

  return new Date(value).toLocaleDateString("ko-KR", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
    ...options,
  });
}
