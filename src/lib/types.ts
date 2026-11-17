export const EVENT_TIPOS = ['conferencia', 'hackaton', 'taller', 'meetup', 'concurso', 'feria'] as const;

export type EventTipo = (typeof EVENT_TIPOS)[number];

export interface EventRecord {
  id: string;
  title: string;
  chip: string;
  color: string;
  organizer: string;
  start: string;
  end: string;
  dateLabel: string;
  timeLabel: string;
  venue: string;
  detail: string;
  url: string | null;
  image: string | null;
  imageFit: 'cover' | 'contain';
  forceLive: boolean;
  tipo: EventTipo;
}

export interface EventsFile {
  timezone: string;
  events: EventRecord[];
}
