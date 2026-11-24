import { modules } from '../../mock/content';
import { readPreferences, savePreferences } from '../../stores/preferences';
import { applyTheme } from '../../themes/tokens';
import { InterestCode } from '../../types';

Page({
  data: { theme: '', modules: [] as (typeof modules[number] & { added: boolean })[] },
  onShow() {
    const prefs = readPreferences();
    this.setData({ theme: applyTheme(prefs.themeId, true), modules: modules.map((item) => ({ ...item, added: prefs.selectedInterests.includes(item.code) })) });
  },
  add(event: WechatMiniprogram.TouchEvent) {
    const code = event.currentTarget.dataset.code as InterestCode;
    const prefs = readPreferences();
    if (prefs.selectedInterests.includes(code)) return;
    try {
      savePreferences({ ...prefs, selectedInterests: [...prefs.selectedInterests, code] });
      this.onShow!();
    } catch {
      wx.showToast({ title: '保存失败，请重试', icon: 'none' });
    }
  },
});
