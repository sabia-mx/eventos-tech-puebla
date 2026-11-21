import type { APIRoute } from 'astro';
import { loadEvents } from '../lib/events';
import type { EventRecord } from '../lib/types';

function withSource(raw: string): string {
  const url = new URL(raw);
  url.searchParams.set('utm_source', 'eventos tech puebla');
  return url.toString();
}

function icsText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function icsStamp(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  let result = '';
  let start = 0;
  let limit = 75;
  while (start < bytes.length) {
    let end = Math.min(start + limit, bytes.length);
    while (end > start && (bytes[end] & 0xc0) === 0x80) end -= 1;
    result += `${result ? '\r\n ' : ''}${new TextDecoder().decode(bytes.slice(start, end))}`;
    start = end;
    limit = 74;
  }
  return result;
}

function eventLines(event: EventRecord, host: string): string[] {
  const url = event.url ? withSource(event.url) : null;
  const description = [event.detail.trim(), url].filter(Boolean).join('\n');
  const lines = [
    'BEGIN:VEVENT',
    `UID:${event.id}@${host}`,
    `DTSTAMP:${icsStamp(new Date().toISOString())}`,
    `DTSTART:${icsStamp(event.start)}`,
    `DTEND:${icsStamp(event.end)}`,
    `SUMMARY:${icsText(event.title)}`,
    `LOCATION:${icsText(event.venue)}`,
  ];
  if (description) lines.push(`DESCRIPTION:${icsText(description)}`);
  if (url) lines.push(`URL:${icsText(url)}`);
  lines.push('END:VEVENT');
  return lines;
}

export const GET: APIRoute = ({ site }) => {
  const origin = site?.origin ?? 'https://eventos-tech-puebla.vercel.app';
  const host = new URL(origin).host;
  const { events } = loadEvents();
  const body = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Eventos tech en Puebla//Calendario//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Eventos tech en Puebla',
    'X-WR-TIMEZONE:America/Mexico_City',
    ...events.flatMap((event) => eventLines(event, host)),
    'END:VCALENDAR',
    '',
  ]
    .map(fold)
    .join('\r\n');

  return new Response(body, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="eventos-tech-puebla.ics"',
    },
  });
};
