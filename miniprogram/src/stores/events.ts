import { accountData, queueEvent, queueDelete } from '../services/account';
import { UserEvent } from '../types';
import { parseDate } from '../utils/date';

const eventsKey = 'youdian.events.v1';

export function readGuestEvents(): UserEvent[] {
  try {
    const value = wx.getStorageSync(eventsKey);
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function allEvents() {
  return accountData()?.events || readGuestEvents();
}

export function eventsFor(date: string) {
  return allEvents().filter((event) => event.date === date);
}

export function saveEvent(event: UserEvent) {
  if (!parseDate(event.date) || !event.title.trim() || event.title.length > 80 || event.content.length > 2000) {
    throw new Error('请检查日期、标题和正文长度');
  }
  const events = readGuestEvents();
  const existing = events.findIndex((item) => item.id === event.id);
  const current = { ...event, title: event.title.trim(), completed: event.kind === 'todo' && event.completed };
  if (queueEvent(current)) return;
  if (existing === -1) events.push(current);
  else events[existing] = current;
  wx.setStorageSync(eventsKey, events);
}

export function deleteEvent(id: string) {
  if (queueDelete(id)) return;
  wx.setStorageSync(eventsKey, readGuestEvents().filter((event) => event.id !== id));
}

export function newEvent(date: string): UserEvent {
  return { id: String(Date.now()) + '-' + Math.random().toString(36).slice(2), date, title: '', content: '', kind: 'note', completed: false };
}

export function clearGuestEvents() { wx.removeStorageSync(eventsKey); }
