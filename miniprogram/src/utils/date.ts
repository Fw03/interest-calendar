declare function require(path: string): unknown;

interface Lunar {
  getDay(): number;
  getMonthInChinese(): string;
  getDayInChinese(): string;
  getJieQi(): string;
}
const { Solar } = require('../vendor/lunar') as {
  Solar: { fromYmd(year: number, month: number, day: number): { getLunar(): Lunar } };
};

export const minDate = '1900-01-01';
export const maxDate = '2099-12-31';
export const weekdays = ['日', '一', '二', '三', '四', '五', '六'];

export function formatDate(year: number, month: number, day: number) {
  return [String(year).padStart(4, '0'), String(month).padStart(2, '0'), String(day).padStart(2, '0')].join('-');
}

export function today(now = new Date()) {
  return formatDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function parseDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < minDate || value > maxDate) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return undefined;
  return { year, month, day, weekday: date.getUTCDay() };
}

export function dayInfo(value: string) {
  const day = parseDate(value);
  if (!day) return undefined;
  const lunar = Solar.fromYmd(day.year, day.month, day.day).getLunar();
  const lunarLabel = lunar.getDay() === 1 ? lunar.getMonthInChinese() + '月' : lunar.getDayInChinese();
  return {
    ...day,
    lunarLabel,
    solarTerm: lunar.getJieQi(),
    weekdayLabel: '星期' + weekdays[day.weekday],
    fullLabel: day.month + '月' + day.day + '日',
  };
}

export function shiftMonth(year: number, month: number, delta: number) {
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

export function monthGrid(year: number, month: number, current = today()) {
  const offset = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1, index - offset + 1));
    const value = formatDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
    const info = dayInfo(value);
    return {
      date: value,
      dayOfMonth: date.getUTCDate(),
      isCurrentMonth: date.getUTCMonth() === month - 1,
      isToday: value === current,
      isSelectable: Boolean(info),
      lunarLabel: info?.lunarLabel || '',
      solarTerm: info?.solarTerm || '',
    };
  });
}
