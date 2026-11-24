import { localDaily } from '../mock/content';
import { DailyContent, ThemeId } from '../types';
import { parseDate } from '../utils/date';
import { api } from './request';

export type TemplateId = 'daily' | 'quote';
export interface PublicCard { date: string; templateId: TemplateId; themeId: ThemeId; contents: DailyContent[] }
export interface Share { token: string; expiresAt: string; card: PublicCard }

export const templateNames = { daily: '每日精选', quote: '极简语录' };

export function localShare(date: string, templateId: TemplateId, themeId: ThemeId): PublicCard {
  const selectedInterests = templateId === 'quote' ? ['quote' as const] : ['almanac' as const, 'quote' as const];
  return { date, templateId, themeId, contents: localDaily(date, { themeId, zodiacSign: '', selectedInterests }) };
}

export function createShare(date: string, templateId: TemplateId, themeId: ThemeId, token: string) {
  return api<Share>('/shares', 'POST', { date, templateId, themeId }, token);
}

export function shareTitle(card: PublicCard) {
  return '日有所喜 · ' + (parseDate(card.date)?.day || '') + '日' + templateNames[card.templateId];
}

export function sharePath(token: string) {
  return '/pages/share-landing/index?ref=friend&token=' + token;
}

export function shareLookup(options: { token?: string; scene?: string; ref?: string }) {
  if (options.scene) {
    let scene: string;
    try { scene = decodeURIComponent(options.scene); } catch { return ''; }
    return /^[a-f0-9]{32}$/.test(scene) ? '/shares/poster/' + scene : '';
  }
  if (!options.token || !/^[a-f0-9]{64}$/.test(options.token)) return '';
  const ref = options.ref === 'friend' || options.ref === 'timeline' ? '?ref=' + options.ref : '';
  return '/shares/' + options.token + ref;
}
