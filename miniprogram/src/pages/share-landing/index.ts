import { reportShare } from '../../services/report';
import { api, ApiError } from '../../services/request';
import { PublicCard, Share, shareLookup } from '../../services/share';
import { applyTheme } from '../../themes/tokens';

Page({
  data: { theme: '', card: null as PublicCard | null, lookup: '', token: '', message: '', loading: false },
  onLoad(options) {
    this.setData({ theme: applyTheme(), lookup: shareLookup(options) });
    void this.open();
  },
  async open() {
    if (!this.data.lookup) { this.setData({ message: '分享链接无效' }); return; }
    this.setData({ message: '', loading: true });
    try {
      const { card, token } = await api<Share>(this.data.lookup);
      this.setData({ theme: applyTheme(card.themeId), card, token });
    } catch (error) {
      this.setData({ message: error instanceof ApiError && error.status === 404 ? '分享不存在或已过期' : '网络暂不可用，可重试打开分享' });
    } finally { this.setData({ loading: false }); }
  },
  report() { reportShare(this.data.token); },
  home() { wx.switchTab({ url: '/pages/calendar/index' }); },
});
