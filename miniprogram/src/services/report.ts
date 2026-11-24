import { api } from './request';

const options = [
  { reason: 'content', label: '内容不当' },
  { reason: 'copyright', label: '版权问题' },
  { reason: 'other', label: '其他问题' },
];

export function reportShare(token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) return;
  wx.showActionSheet({
    itemList: options.map(({ label }) => label),
    success: async ({ tapIndex }) => {
      const option = options[tapIndex];
      if (!option) return;
      try {
        await api('/shares/' + token + '/reports', 'POST', { reason: option.reason });
        wx.showToast({ title: '举报已提交' });
      } catch { wx.showToast({ title: '暂时无法提交举报', icon: 'none' }); }
    },
  });
}
