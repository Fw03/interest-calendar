import { signs } from '../../mock/content';
import { allEvents, readGuestEvents } from '../../stores/events';
import { readGuestPreferences, readPreferences, savePreferences } from '../../stores/preferences';
import { applyTheme, themes } from '../../themes/tokens';
import { accountStatus, accountToken, currentAccount, importGuest, resolveConflict, signIn, signOut, syncAccount } from '../../services/account';
import { connected } from '../../services/request';

Page({
  data: {
    theme: '', themeName: '', days: 0, interestCount: 0, signs, signIndex: 0,
    connected, account: false, authorized: false, busy: false, status: accountStatus(),
  },
  onShow() { this.refresh(); void syncAccount().then(() => this.refresh()); },
  refresh() {
    const prefs = readPreferences();
    this.setData({
      theme: applyTheme(prefs.themeId, true), themeName: themes[prefs.themeId].name,
      days: new Set(allEvents().map((event) => event.date)).size,
      interestCount: prefs.selectedInterests.length, signIndex: Math.max(0, signs.indexOf(prefs.zodiacSign)),
      account: Boolean(currentAccount()), authorized: Boolean(accountToken()), status: accountStatus(),
    });
  },
  changeSign(event: WechatMiniprogram.PickerChange) {
    const value = Number(event.detail.value);
    if (!Number.isInteger(value) || value < 0 || value >= signs.length) return;
    try {
      savePreferences({ ...readPreferences(), zodiacSign: value ? signs[value] : '' });
      this.refresh();
      void syncAccount(false).then(() => this.refresh());
    } catch { wx.showToast({ title: '保存失败，请重试', icon: 'none' }); }
  },
  async run(action: () => Promise<void>) {
    if (this.data.busy) return;
    this.setData({ busy: true });
    try { await action(); }
    catch (error) { wx.showToast({ title: error instanceof Error ? error.message : '操作失败，请重试', icon: 'none' }); }
    finally { this.setData({ busy: false }); this.refresh(); }
  },
  login() { void this.run(signIn); },
  logout() { void this.run(signOut); },
  retry() { void this.run(syncAccount); },
  migrate() {
    wx.showModal({
      title: '导入本机记录',
      content: '将离线日程复制到当前微信账号。云端已有偏好时会继续使用云端偏好。',
      confirmText: '导入',
      success: ({ confirm }) => {
        if (!confirm) return;
        void this.run(async () => {
          await syncAccount();
          importGuest(readGuestPreferences(), readGuestEvents());
          await syncAccount(false);
        });
      },
    });
  },
  keepLocal() { void this.run(() => resolveConflict(true)); },
  keepCloud() {
    wx.showModal({
      title: '使用云端版本', content: '确定放弃当前账号在此设备上尚未同步的修改？', confirmText: '使用云端',
      success: ({ confirm }) => { if (confirm) void this.run(() => resolveConflict(false)); },
    });
  },
  themes() { wx.navigateTo({ url: '/pages/themes/index' }); },
  interests() { wx.navigateTo({ url: '/pages/interests/index' }); },
  privacy() { wx.navigateTo({ url: '/pages/privacy/index' }); },
  feedback() { wx.navigateTo({ url: '/pages/feedback/index' }); },
});
