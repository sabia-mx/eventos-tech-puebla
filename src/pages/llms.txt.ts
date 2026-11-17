import type { APIRoute } from 'astro';
import { loadEvents } from '../lib/events';

const labels: Record<string, string> = {
  conferencia: 'Conferencia',
  hackaton: 'Hackatón',
  taller: 'Taller',
  meetup: 'Meetup',
  concurso: 'Concurso',
  feria: 'Expo',
};

export const GET: APIRoute = ({ site }) => {
  const origin = site?.origin ?? 'https://eventos-tech-puebla.vercel.app';
  const { events, timezone } = loadEvents();
  const body = [
    '# Eventos tech en Puebla',
    '',
    '> Eventos tech en Puebla: conferencias, hackatones, talleres, meetups, concursos y expos de tecnología, ciencia e innovación.',
    '',
    `Calendario público de eventos tech en Puebla. Los horarios están en ${timezone}. La página muestra un mes a la vez y también una vista de 12 meses. Se puede filtrar por conferencia, hackatón, taller, meetup, concurso y expo.`,
    '',
    '## Página',
    '',
    `- [Eventos tech en Puebla](${origin}/): calendario, fichas y enlaces de registro.`,
    '',
    '## Eventos',
    '',
    ...events.map(
      (event) =>
        `- ${event.title}. ${labels[event.tipo] ?? event.tipo}. ${event.dateLabel}. ${event.timeLabel}. ${event.venue}.`,
    ),
    '',
  ].join('\n');

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
