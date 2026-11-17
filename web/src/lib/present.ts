import { paintFor, type AccentPaint } from './color';
import { qrSvg } from './qr';
import type { EventRecord } from './types';

export interface PresentedEvent extends EventRecord {
  number: number;
  qr: string | null;
  showDetail: boolean;
  paint: AccentPaint;
}

function withSource(raw: string): string {
  const url = new URL(raw);
  url.searchParams.set('utm_source', 'eventos tech puebla');
  return url.toString();
}

function shouldShowDetail(event: EventRecord): boolean {
  const detail = event.detail.trim();
  if (!detail) return false;
  const duplicates = [event.timeLabel, event.venue, event.organizer, event.dateLabel, event.title];
  return duplicates.every((value) => value.trim() !== detail);
}

export async function presentEvents(events: EventRecord[]): Promise<PresentedEvent[]> {
  return Promise.all(
    events.map(async (event, index) => {
      const paint = paintFor(event.color);
      const url = event.url ? withSource(event.url) : null;
      return {
        ...event,
        url,
        number: index + 1,
        qr: url ? await qrSvg(url, paint.accentInk) : null,
        showDetail: shouldShowDetail(event),
        paint,
      };
    }),
  );
}
