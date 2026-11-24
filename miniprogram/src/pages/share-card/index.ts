import { reportShare } from '../../services/report';
import { accountToken } from '../../services/account';
import { api, ApiError, connected } from '../../services/request';
import { downloadCode, drawPoster } from '../../services/poster';
import { createShare, localShare, PublicCard, Share, shareLookup, sharePath, shareTitle, TemplateId, templateNames } from '../../services/share';
import { readPreferences } from '../../stores/preferences';
import { applyTheme } from '../../themes/tokens';
import { parseDate, today } from '../../utils/date';

Page({
  data: {
    theme: '', card: null as PublicCard | null, token: '', expiry: '', loading: false,
    incoming: false, lookup: '', error: '', poster: '', posterMessage: '', connected,
  },
  onLoad(options) {
    if (options.token !== undefined || options.ref === 'timeline') {
      this.setData({ incoming: true, theme: applyTheme(), lookup: shareLookup(options) });
      void this.openIncoming();
      return;
    }
    const date = options.date && parseDate(options.date) ? options.date : today();
    const themeId = readPreferences().themeId;
    this.setData({ theme: applyTheme(themeId), card: localShare(date, 'daily', themeId) });
    wx.hideShareMenu({ menus: ['shareAppMessage', 'shareTimeline'] });
  },
  async openIncoming() {
    if (!this.data.lookup) { this.setData({ error: '分享链接无效' }); return; }
    this.setData({ loading: true, error: '' });
    try {
      const { card, token } = await api<Share>(this.data.lookup);
      this.setData({ card, token, theme: applyTheme(card.themeId) });
    } catch (error) {
      this.setData({ error: error instanceof ApiError && error.status === 404 ? '分享不存在或已过期' : '暂时无法打开分享，可稍后重试' });
    } finally { this.setData({ loading: false }); }
  },
  choose(event: WechatMiniprogram.TouchEvent) {
    const card = this.data.card;
    if (this.data.loading || !card) return;
    const id = event.currentTarget.dataset.id as TemplateId;
    if (!Object.prototype.hasOwnProperty.call(templateNames, id)) return;
    this.setData({ card: localShare(card.date, id, card.themeId), token: '', expiry: '', poster: '', error: '', posterMessage: '' });
    wx.hideShareMenu({ menus: ['shareAppMessage', 'shareTimeline'] });
  },
  async publish() {
    const { card, loading } = this.data;
    if (!card || loading) return;
    const token = accountToken();
    if (!token) { this.setData({ error: '创建微信分享前，请在「我的」登录' }); return; }
    this.setData({ loading: true, error: '', poster: '', posterMessage: '' });
    try {
      const share = await createShare(card.date, card.templateId, card.themeId, token);
      this.setData({ card: share.card, token: share.token, expiry: share.expiresAt });
      wx.showShareMenu({ menus: ['shareAppMessage', 'shareTimeline'] });
    } catch (error) {
      this.setData({ error: error instanceof Error ? error.message : '创建失败，请重试' });
    } finally { this.setData({ loading: false }); }
  },
  onShareAppMessage() {
    const { card, token, expiry } = this.data;
    if (card && token && Date.parse(expiry) > Date.now()) return { title: shareTitle(card), path: sharePath(token) };
    return { title: '日有所喜', path: '/pages/calendar/index' };
  },
  onShareTimeline() {
    const { card, token, expiry } = this.data;
    if (card && token && Date.parse(expiry) > Date.now()) return { title: shareTitle(card), query: 'ref=timeline&token=' + token };
  },
  async poster() {
    const { card, loading, token } = this.data;
    if (!card || loading) return;
    this.setData({ loading: true, error: '', posterMessage: '' });
    try {
      const canvas = await new Promise<WechatMiniprogram.Canvas>((resolve, reject) => {
        wx.createSelectorQuery().select('#poster').fields({ node: true }, (result) => {
          const node = (result as { node?: WechatMiniprogram.Canvas } | null)?.node;
          node ? resolve(node) : reject(new Error('此设备不支持海报画布'));
        }).exec();
      });
      let code = '';
      const owner = accountToken();
      if (token && owner) {
        try { code = await downloadCode(token, owner); } catch { /* Offline preview remains exportable. */ }
      }
      const poster = await drawPoster(canvas, card, code);
      this.setData({ poster, posterMessage: code ? '小程序码随分享链接有效一周' : '开发占位海报，暂无可扫码的小程序码' });
    } catch (error) {
      this.setData({ error: error instanceof Error ? error.message : '海报生成失败，请重试' });
    } finally { this.setData({ loading: false }); }
  },
  savePoster() {
    if (!this.data.poster) return;
    wx.saveImageToPhotosAlbum({
      filePath: this.data.poster,
      success: () => wx.showToast({ title: '海报已保存' }),
      fail: () => wx.getSetting({
        success: ({ authSetting }) => {
          if (authSetting['scope.writePhotosAlbum'] === false) {
            wx.showModal({
              title: '需要相册权限', content: '可前往设置允许保存图片，返回后再试。', confirmText: '打开设置',
              success: ({ confirm }) => { if (confirm) wx.openSetting({}); },
            });
          } else wx.showToast({ title: '保存失败，请重试', icon: 'none' });
        },
        fail: () => wx.showToast({ title: '保存失败，请重试', icon: 'none' }),
      }),
    });
  },
  report() { reportShare(this.data.token); },
  home() { wx.switchTab({ url: '/pages/calendar/index' }); },
});
