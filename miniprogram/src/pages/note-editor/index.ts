import { allEvents, deleteEvent, newEvent, saveEvent } from '../../stores/events';
import { applyTheme } from '../../themes/tokens';
import { maxDate, minDate, parseDate, today } from '../../utils/date';

Page({
  data: { theme: '', event: newEvent(today()), editing: false, missing: false, minDate, maxDate, error: '' },
  onLoad(options) {
    const existing = options.id && allEvents().find((event) => event.id === options.id);
    const date = options.date && parseDate(options.date) ? options.date : today();
    this.setData({ event: existing || newEvent(date), editing: Boolean(existing), missing: Boolean(options.id && !existing) });
  },
  onShow() { this.setData({ theme: applyTheme() }); },
  editTitle(event: WechatMiniprogram.Input) { this.setData({ 'event.title': event.detail.value, error: '' }); },
  editContent(event: WechatMiniprogram.TextareaInput) { this.setData({ 'event.content': event.detail.value }); },
  editDate(event: WechatMiniprogram.PickerChange) { this.setData({ 'event.date': String(event.detail.value) }); },
  toggleTodo(event: WechatMiniprogram.SwitchChange) { this.setData({ 'event.kind': event.detail.value ? 'todo' : 'note' }); },
  toggleDone(event: WechatMiniprogram.SwitchChange) { this.setData({ 'event.completed': event.detail.value }); },
  save() {
    if (this.data.missing) return;
    if (!this.data.event.title.trim()) { this.setData({ error: '请输入标题' }); return; }
    try {
      saveEvent(this.data.event);
      wx.navigateBack();
    } catch {
      this.setData({ error: '保存失败，请检查日期与内容后重试' });
    }
  },
  remove() {
    wx.showModal({
      title: '删除日程', content: '确定删除这条日程？', confirmText: '删除',
      success: ({ confirm }) => {
        if (!confirm) return;
        try { deleteEvent(this.data.event.id); wx.navigateBack(); }
        catch { this.setData({ error: '删除失败，请重试' }); }
      },
    });
  },
});
