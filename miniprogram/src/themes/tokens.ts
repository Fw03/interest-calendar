import { ThemeId } from '../types';
import { readPreferences, themeIds } from '../stores/preferences';

export const themes = {
  cream: { name: '奶油治愈', bg: '#FFF9F1', card: '#FFFFFF', text: '#453B35', brand: '#8E4C34', accent: '#C68F6C', soft: '#F4E7DA', muted: '#6F5F55', onBrand: '#FFFFFF' },
  ink: { name: '东方国风', bg: '#F5F0E6', card: '#FFFDF7', text: '#382E27', brand: '#A34336', accent: '#A34336', soft: '#EADFD1', muted: '#67564C', onBrand: '#FFFFFF' },
  night: { name: '星空梦幻', bg: '#18182F', card: '#272640', text: '#F7EFFD', brand: '#C6B3FB', accent: '#B59CF4', soft: '#373653', muted: '#CBC1DD', onBrand: '#241A37' },
  mint: { name: '清新简约', bg: '#F0F8F5', card: '#FFFFFF', text: '#2A5148', brand: '#246953', accent: '#3C9C81', soft: '#DEF1E9', muted: '#49665D', onBrand: '#FFFFFF' },
};

export const themeChoices = themeIds.map((id) => ({ id, ...themes[id] }));

export function applyTheme(id = readPreferences().themeId, tab = false) {
  const palette = themes[id];
  wx.setNavigationBarColor({ frontColor: id === 'night' ? '#ffffff' : '#000000', backgroundColor: palette.bg });
  wx.setBackgroundColor({ backgroundColor: palette.bg });
  if (tab) wx.setTabBarStyle({ backgroundColor: palette.card, color: palette.muted, selectedColor: palette.brand, borderStyle: id === 'night' ? 'white' : 'black' });
  return themeStyle(id);
}

export function themeStyle(id: ThemeId) {
  const tone = themes[id];
  return Object.entries(tone).filter(([key]) => key !== 'name').map(([key, value]) => '--' + key + ':' + value).join(';');
}
