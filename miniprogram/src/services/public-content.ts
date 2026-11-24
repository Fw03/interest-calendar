import { DailyContent } from '../types';
import { api, connected } from './request';

const cache = new Map<string, { expires: number; cards: DailyContent[] }>();

export function cachedDaily(date: string) {
  return cache.get(date)?.cards || [];
}

export async function fetchDaily(date: string) {
  if (!connected) return;
  const current = cache.get(date);
  if (current && current.expires > Date.now()) return;
  const daily = await api<{ contents: DailyContent[] }>('/calendar/daily?date=' + encodeURIComponent(date));
  if (cache.size >= 62) cache.delete(cache.keys().next().value!);
  cache.set(date, { expires: Date.now() + 300_000, cards: daily.contents });
}
