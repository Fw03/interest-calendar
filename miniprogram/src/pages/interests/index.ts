import { modules } from '../../mock/content';
import { moveInterest, readPreferences, savePreferences } from '../../stores/preferences';
import { applyTheme } from '../../themes/tokens';
import { InterestCode } from '../../types';

Page({
  data: { theme: '', active: [] as typeof modules, inactive: [] as typeof modules },
  onShow() { this.refresh(); },
  refresh() {
    const prefs = readPreferences();
    const byCode = new Map(modules.map((item) => [item.code, item]));
    this.setData({
      theme: applyTheme(prefs.themeId),
      active: prefs.selectedInterests.map((code) => byCode.get(code)!),
      inactive: modules.filter((item) => !prefs.selectedInterests.includes(item.code)),
    });
  },
  change(event: WechatMiniprogram.TouchEvent) {
    const { code, action, delta } = event.currentTarget.dataset as { code: InterestCode; action: string; delta: string };
    const prefs = readPreferences();
    const current = prefs.selectedInterests;
    const next = action === 'move' ? moveInterest(current, code, Number(delta))
      : current.includes(code) ? current.filter((item) => item !== code) : [...current, code];
    try {
      savePreferences({ ...prefs, selectedInterests: next });
      this.refresh();
    } catch {
      wx.showToast({ title: '保存失败，请重试', icon: 'none' });
    }
  },
  done() { wx.navigateBack(); },
});
