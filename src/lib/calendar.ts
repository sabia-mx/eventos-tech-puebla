import { dayWash, type AccentPaint } from './color';

const WEEKDAY_LABELS = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'] as const;
const WEEKDAY_LONG = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'] as const;

export interface CalendarEvent {
  id: string;
  title: string;
  chip: string;
  start: string;
  end: string;
  number: number;
  paint: AccentPaint;
}

export type ChipSpan = 'single' | 'start' | 'mid' | 'end';

export interface DayChip {
  id: string;
  number: number;
  chip: string;
  short: string;
  solid: string;
  onSolid: string;
  label: string;
  span: ChipSpan;
}

export interface DayCell {
  kind: 'day';
  date: string;
  day: number;
  isToday: boolean;
  wash: string | null;
  events: DayChip[];
  dayLabel: string;
}

export interface PadCell {
  kind: 'pad';
}

export interface CalendarModel {
  monthLabel: string;
  monthTitle: string;
  year: number;
  weekdayLabels: readonly string[];
  cells: Array<DayCell | PadCell>;
  hasNasa: boolean;
}

export interface MexicoToday {
  key: string;
  day: number;
  month: number;
  year: number;
  weekdayVisible: string;
  weekdaySpoken: string;
}

interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

function calendarDate(iso: string): CalendarDate {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) throw new Error(`Invalid date ${iso}`);
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function stamp(date: CalendarDate): number {
  return date.year * 10000 + date.month * 100 + date.day;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function weekdayIndex(year: number, month: number, day: number): number {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function shortChip(label: string): string {
  if (label === 'Conéctate') return 'Conect.';
  if (label === 'Meetup') return 'Meet';
  if (label === 'Claude') return 'Claude';
  if (label === 'Kickoff') return 'Kick';
  if (label === 'Energía') return 'Energ.';
  if (label.length <= 6) return label;
  return `${label.slice(0, 5)}.`;
}

function joinWeekRuns(cells: Array<DayCell | PadCell>): void {
  for (let row = 0; row < cells.length; row += 7) {
    const week = cells.slice(row, row + 7);
    const ids = new Set<string>();
    for (const cell of week) {
      if (cell.kind !== 'day') continue;
      for (const event of cell.events) ids.add(event.id);
    }

    for (const id of ids) {
      let run: DayChip[] = [];
      const close = () => {
        if (run.length > 1) {
          run[0].span = 'start';
          run[run.length - 1].span = 'end';
          for (let index = 1; index < run.length - 1; index += 1) run[index].span = 'mid';
        }
        run = [];
      };

      for (const cell of week) {
        const chip = cell.kind === 'day' ? cell.events.find((event) => event.id === id) : undefined;
        if (chip) run.push(chip);
        else close();
      }
      close();
    }
  }
}

function covers(event: CalendarEvent, year: number, month: number, day: number): boolean {
  const start = calendarDate(event.start);
  const end = calendarDate(event.end);
  const current = year * 10000 + month * 100 + day;
  return current >= stamp(start) && current <= stamp(end);
}

export function mexicoToday(timezone: string, now = new Date()): MexicoToday {
  const numeric = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    numeric.find((part) => part.type === type)?.value ?? '';
  const weekdaySpoken = new Intl.DateTimeFormat('es-MX', {
    timeZone: timezone,
    weekday: 'long',
  }).format(now);

  return {
    key: `${pick('year')}-${pick('month')}-${pick('day')}`,
    day: Number(pick('day')),
    month: Number(pick('month')),
    year: Number(pick('year')),
    weekdaySpoken,
    weekdayVisible: weekdaySpoken.toLocaleUpperCase('es-MX'),
  };
}

function monthKeys(events: CalendarEvent[]): number[] {
  const keys = new Set<number>();
  for (const event of events) {
    const start = calendarDate(event.start);
    const end = calendarDate(event.end);
    let year = start.year;
    let month = start.month;
    while (year < end.year || (year === end.year && month <= end.month)) {
      keys.add(year * 100 + month);
      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
    }
  }
  return [...keys].sort((left, right) => left - right);
}

function buildMonth(events: CalendarEvent[], today: MexicoToday, year: number, month: number): CalendarModel {
  const monthDate = new Date(Date.UTC(year, month - 1, 1, 12));
  const monthLabel = new Intl.DateTimeFormat('es-MX', {
    month: 'long',
    timeZone: 'UTC',
  }).format(monthDate);
  const leading = weekdayIndex(year, month, 1);
  const total = daysInMonth(year, month);
  const cells: Array<DayCell | PadCell> = Array.from({ length: leading }, () => ({ kind: 'pad' }));

  for (let day = 1; day <= total; day += 1) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayEvents = events.filter((event) => covers(event, year, month, day));
    const weekday = WEEKDAY_LONG[weekdayIndex(year, month, day)] ?? 'día';
    cells.push({
      kind: 'day',
      date,
      day,
      isToday: date === today.key,
      wash: dayWash(dayEvents.map((event) => event.paint.accent)),
      dayLabel: `${weekday} ${day} de ${monthLabel}`,
      events: dayEvents.map((event) => ({
        id: event.id,
        number: event.number,
        chip: event.chip,
        short: shortChip(event.chip),
        solid: event.paint.solid,
        onSolid: event.paint.onSolid,
        label: `${weekday} ${day} de ${monthLabel}: ${event.title}`,
        span: 'single',
      })),
    });
  }

  while (cells.length % 7 !== 0) cells.push({ kind: 'pad' });
  joinWeekRuns(cells);

  return {
    monthLabel,
    monthTitle: monthLabel.toLocaleUpperCase('es-MX'),
    year,
    weekdayLabels: WEEKDAY_LABELS,
    cells,
    hasNasa: events.some((event) => event.id === 'nasa-space-apps'),
  };
}

export function eventMonthKeys(start: string, end: string): string[] {
  const first = calendarDate(start);
  const last = calendarDate(end);
  const keys: string[] = [];
  let year = first.year;
  let month = first.month;
  while (year < last.year || (year === last.year && month <= last.month)) {
    keys.push(`${year}-${String(month).padStart(2, '0')}`);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return keys;
}

export function agendaYears(events: CalendarEvent[], today: MexicoToday): number[] {
  const years = new Set<number>([today.year]);
  for (const event of events) {
    years.add(calendarDate(event.start).year);
    years.add(calendarDate(event.end).year);
  }
  return [...years].sort((left, right) => left - right);
}

export function buildYear(events: CalendarEvent[], today: MexicoToday, year: number): CalendarModel[] {
  return Array.from({ length: 12 }, (_, index) => buildMonth(events, today, year, index + 1));
}

export interface SpanMonth {
  key: string;
  year: number;
  month: number;
  calendar: CalendarModel;
}

export function buildSpan(events: CalendarEvent[], today: MexicoToday, count = 12): SpanMonth[] {
  let year = today.year;
  let month = today.month - 1;
  if (month < 1) {
    month = 12;
    year -= 1;
  }

  const span: SpanMonth[] = [];
  for (let index = 0; index < count; index += 1) {
    const key = `${year}-${String(month).padStart(2, '0')}`;
    span.push({
      key,
      year,
      month,
      calendar: buildMonth(events, today, year, month),
    });
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return span;
}

export function buildMonths(events: CalendarEvent[], today: MexicoToday): CalendarModel[] {
  return monthKeys(events)
    .map((key) => buildMonth(events, today, Math.floor(key / 100), key % 100))
    .filter((month) => month.cells.some((cell) => cell.kind === 'day' && cell.events.length > 0));
}

export function buildCalendar(events: CalendarEvent[], today: MexicoToday): CalendarModel {
  const months = buildMonths(events, today);
  const month = months[0];
  if (!month) throw new Error('No events to place on the calendar');
  return month;
}

export function monthEventIds(month: CalendarModel): string[] {
  const ids: string[] = [];
  for (const cell of month.cells) {
    if (cell.kind !== 'day') continue;
    for (const event of cell.events) {
      if (!ids.includes(event.id)) ids.push(event.id);
    }
  }
  return ids;
}
