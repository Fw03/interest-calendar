import { accountToken, deleteAccount } from '../../services/account';
import { clearGuest, readPreferences } from '../../stores/preferences';
import { clearGuestEvents } from '../../stores/events';
import { applyTheme } from '../../themes/tokens';

Page({
  data: { theme: '', signedIn: false, busy: false, message: '' },
  onShow() {
    this.setData({ theme: applyTheme(), signedIn: Boolean(accountToken()) });
  },
  clearDevice() {
    wx.showModal({
      title: '清除离线访客数据',
      content: '这将清除当前设备上登录前保存的日程、主题和兴趣，且无法撤销。',
      confirmText: '清除',
      success: ({ confirm }) => {
        if (!confirm) return;
        try {
          clearGuestEvents();
          clearGuest();
          this.setData({ message: '离线访客数据已清除', theme: applyTheme(readPreferences().themeId) });
        } catch { this.setData({ message: '清除未完全完成，请重试。' }); }
      },
    });
  },
  confirmDeletion() {
    if (this.data.busy) return;
    wx.showModal({
      title: '删除微信账号数据',
      content: '将删除当前账号的偏好、日程、会话、分享和反馈。本机尚未同步的当前账号修改也会删除。操作无法撤销。',
      confirmText: '确认删除',
      success: ({ confirm }) => { if (confirm) void this.delete(); },
    });
  },
  async delete() {
    if (this.data.busy) return;
    this.setData({ busy: true, message: '' });
    try {
      await deleteAccount();
      this.setData({ message: '账号数据已删除', signedIn: false, theme: applyTheme() });
    } catch (error) {
      this.setData({ message: error instanceof Error ? error.message : '删除未完成，请重试' });
    } finally { this.setData({ busy: false }); }
  },
});
