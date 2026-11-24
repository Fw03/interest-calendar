import { accountToken } from '../../services/account';
import { api } from '../../services/request';
import { applyTheme } from '../../themes/tokens';

Page({
  data: { theme: '', text: '', signedIn: false, busy: false, message: '' },
  onShow() { this.setData({ theme: applyTheme(), signedIn: Boolean(accountToken()) }); },
  write(event: WechatMiniprogram.TextareaInput) { this.setData({ text: event.detail.value, message: '' }); },
  async send() {
    if (this.data.busy) return;
    const token = accountToken();
    const message = this.data.text.trim();
    if (!message || !token) return;
    this.setData({ busy: true });
    try {
      await api('/feedback', 'POST', { message }, token);
      this.setData({ text: '', message: '反馈已提交' });
    } catch (error) {
      this.setData({ message: error instanceof Error ? error.message : '提交失败，请重试' });
    } finally { this.setData({ busy: false }); }
  },
});
