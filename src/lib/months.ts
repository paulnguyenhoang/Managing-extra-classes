// Tiện ích cho tháng dạng chuỗi "YYYY-MM". So sánh chuỗi trực tiếp là đúng thứ tự
// thời gian vì định dạng cố định zero-padded. Dùng chung cho Payments/Scores/lifecycle.

export function isValidMonthKey(month: string) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(month);
}

export function currentMonthKey(today = new Date()) {
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function compareMonths(first: string, second: string) {
  return first < second ? -1 : first > second ? 1 : 0;
}

export function addMonths(month: string, offset: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(year, monthNumber - 1 + offset, 1);
  return currentMonthKey(date);
}

export function previousMonth(month: string) {
  return addMonths(month, -1);
}

export function monthsInRange(start: string, end: string): string[] {
  if (!isValidMonthKey(start) || !isValidMonthKey(end) || start > end) {
    return [];
  }

  const months: string[] = [];
  let current = start;

  while (current <= end) {
    months.push(current);
    current = addMonths(current, 1);
  }

  return months;
}

export function clampMonthToRange(month: string, start: string, end: string) {
  if (month < start) {
    return start;
  }

  if (month > end) {
    return end;
  }

  return month;
}

export function formatMonthLabel(month: string) {
  const [year, monthNumber] = month.split("-");
  return `${monthNumber}/${year}`;
}
