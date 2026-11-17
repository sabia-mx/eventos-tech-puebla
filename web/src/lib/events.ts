import raw from '../../../fuentes/events.json';
import { EVENT_TIPOS, type EventRecord, type EventTipo, type EventsFile } from './types';

const ISO_WITH_OFFSET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/;
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HEX = /^#[0-9a-fA-F]{6}$/;

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function requiredString(record: Record<string, unknown>, key: string, label: string): string {
  const value = record[key];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${label} is missing ${key}`);
  }
  return value;
}

function calendarStamp(iso: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) throw new Error(`Invalid date ${iso}`);
  return Number(match[1]) * 10000 + Number(match[2]) * 100 + Number(match[3]);
}

function parseEvent(value: unknown, index: number): EventRecord {
  const label = `events[${index}]`;
  const record = asRecord(value, label);
  const id = requiredString(record, 'id', label);
  if (!ID.test(id)) throw new Error(`${label} has an invalid id`);

  const color = requiredString(record, 'color', label);
  if (!HEX.test(color)) throw new Error(`${label} has an invalid color`);

  const start = requiredString(record, 'start', label);
  const end = requiredString(record, 'end', label);
  if (!ISO_WITH_OFFSET.test(start) || !ISO_WITH_OFFSET.test(end)) {
    throw new Error(`${label} dates must include an offset`);
  }
  if (calendarStamp(end) < calendarStamp(start)) {
    throw new Error(`${label} ends before it starts`);
  }

  const urlValue = record.url;
  let url: string | null;
  if (urlValue === null) {
    url = null;
  } else if (typeof urlValue === 'string' && /^https:\/\//.test(urlValue)) {
    url = urlValue;
  } else {
    throw new Error(`${label} url must be an https URL or null`);
  }

  const imageValue = record.image;
  let image: string | null;
  if (imageValue === undefined || imageValue === null) {
    image = null;
  } else if (typeof imageValue === 'string' && /^\/eventos\/[a-z0-9-]+\.webp$/.test(imageValue)) {
    image = imageValue;
  } else {
    throw new Error(`${label} image must be a local webp or null`);
  }

  const fitValue = record.imageFit;
  let imageFit: 'cover' | 'contain' = 'cover';
  if (fitValue !== undefined) {
    if (fitValue !== 'cover' && fitValue !== 'contain') {
      throw new Error(`${label} imageFit must be cover or contain`);
    }
    imageFit = fitValue;
  }

  if (record.forceLive !== undefined && typeof record.forceLive !== 'boolean') {
    throw new Error(`${label} forceLive must be true or false`);
  }

  const tipo = requiredString(record, 'tipo', label);
  if (!EVENT_TIPOS.includes(tipo as EventTipo)) {
    throw new Error(`${label} has an invalid tipo`);
  }

  return {
    id,
    title: requiredString(record, 'title', label),
    chip: requiredString(record, 'chip', label),
    color,
    organizer: requiredString(record, 'organizer', label),
    start,
    end,
    dateLabel: requiredString(record, 'dateLabel', label),
    timeLabel: requiredString(record, 'timeLabel', label),
    venue: requiredString(record, 'venue', label),
    detail: requiredString(record, 'detail', label),
    url,
    image,
    imageFit,
    forceLive: record.forceLive === true,
    tipo: tipo as EventTipo,
  };
}

export function loadEvents(): EventsFile {
  const record = asRecord(raw, 'events.json');
  const timezone = record.timezone;
  if (typeof timezone !== 'string' || timezone.trim().length === 0) {
    throw new Error('events.json is missing timezone');
  }

  try {
    new Intl.DateTimeFormat('es-MX', { timeZone: timezone }).format(new Date());
  } catch {
    throw new Error(`events.json timezone is invalid: ${timezone}`);
  }

  if (!Array.isArray(record.events) || record.events.length === 0) {
    throw new Error('events.json events must be a non-empty array');
  }

  const events = record.events.map((event, index) => parseEvent(event, index));
  const ids = new Set<string>();
  for (const event of events) {
    if (ids.has(event.id)) throw new Error(`Duplicate event id ${event.id}`);
    ids.add(event.id);
  }

  return { timezone, events };
}
