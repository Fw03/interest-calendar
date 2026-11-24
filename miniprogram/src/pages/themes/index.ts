import { readPreferences, savePreferences } from '../../stores/preferences';
import { applyTheme, themeChoices } from '../../themes/tokens';
import { ThemeId } from '../../types';

Page({
  data: { theme: '', themeId: 'cream' as ThemeId, choices: themeChoices },
  onShow() {
    const { themeId } = readPreferences();
    this.setData({ theme: applyTheme(themeId), themeId });
  },
  pick(event: WechatMiniprogram.TouchEvent) {
    const themeId = event.currentTarget.dataset.theme as ThemeId;
    if (!themeChoices.some((item) => item.id === themeId)) return;
    try {
      savePreferences({ ...readPreferences(), themeId });
      this.setData({ theme: applyTheme(themeId), themeId });
    } catch {
      wx.showToast({ title: '保存失败，请重试', icon: 'none' });
    }
  },
});
