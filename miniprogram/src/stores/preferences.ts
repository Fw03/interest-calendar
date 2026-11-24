import { accountData, queuePreferences } from '../services/account';
import { modules, defaultInterests, signs } from '../mock/content';
import { InterestCode, Preferences, ThemeId } from '../types';

const preferenceKey = 'youdian.preferences.v1';
export const themeIds: ThemeId[] = ['cream', 'ink', 'night', 'mint'];

export function normalizePreferences(value?: Partial<Preferences>): Preferences {
  const themeId = themeIds.find((theme) => theme === value?.themeId) || 'cream';
  const zodiacSign = signs.slice(1).find((sign) => sign === value?.zodiacSign) || '';
  const unique = Array.isArray(value?.selectedInterests) ? [...new Set(value.selectedInterests)] : defaultInterests;
  return { themeId, zodiacSign, selectedInterests: unique.filter((code) => modules.some((module) => module.code === code)) };
}

export function readGuestPreferences(): Preferences {
  try {
    return normalizePreferences(wx.getStorageSync(preferenceKey));
  } catch {
    return normalizePreferences();
  }
}

export function readPreferences() {
  const account = accountData();
  return account ? normalizePreferences(account.preferences) : readGuestPreferences();
}

export function savePreferences(preferences: Preferences) {
  if (queuePreferences(normalizePreferences(preferences))) return;
  wx.setStorageSync(preferenceKey, normalizePreferences(preferences));
}

export function moveInterest(items: InterestCode[], code: InterestCode, delta: number) {
  const index = items.indexOf(code);
  const target = index + delta;
  const next = items.slice();
  if (index >= 0 && target >= 0 && target < items.length) {
    next.splice(index, 1);
    next.splice(target, 0, code);
  }
  return next;
}

export function clearGuest() { wx.removeStorageSync(preferenceKey); }
