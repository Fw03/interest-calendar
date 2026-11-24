import { accountStatus, syncAccount } from '../../services/account';
import { cachedDaily, fetchDaily } from '../../services/public-content';
import { cardsFor } from '../../mock/content';
import { eventsFor } from '../../stores/events';
import { readPreferences } from '../../stores/preferences';
import { applyTheme, themes } from '../../themes/tokens';
import { dayInfo, monthGrid, parseDate, shiftMonth, today, weekdays } from '../../utils/date';

Page({
  data: {
    theme: '', themeName: '', date: today(), year: 0, month: 0, gridToday: '',
    publicError: false, syncMessage: '',
    weekdays, days: [] as ReturnType<typeof monthGrid>, selected: dayInfo(today()),
    cards: [] as ReturnType<typeof cardsFor>, events: [] as ReturnType<typeof eventsFor>,
  },
  onShow() {
    this.select(this.data.date);
    void syncAccount().then(() => this.render(this.data.date));
  },
  select(date: string) {
    if (!parseDate(date)) return;
    this.setData({ publicError: false });
    this.render(date);
    void fetchDaily(date).then(() => {
      if (this.data.date === date) this.render(date);
    }).catch(() => {
      if (this.data.date === date) this.setData({ publicError: true });
    });
  },
  render(date: string) {
    const selected = dayInfo(date);
    if (!selected) return;
    const preferences = readPreferences();
    const { year, month } = selected;
    const status = accountStatus();
    const current = today();
    const refreshGrid = year !== this.data.year || month !== this.data.month || current !== this.data.gridToday;
    this.setData({
      theme: applyTheme(preferences.themeId, true), themeName: themes[preferences.themeId].name,
      date, year, month, selected, cards: cardsFor(date, preferences, cachedDaily(date)), events: eventsFor(date),
      syncMessage: status.pending || status.conflict ? status.message : '',
      ...(refreshGrid ? { days: monthGrid(year, month, current), gridToday: current } : {}),
    });
  },
  move(event: WechatMiniprogram.TouchEvent) {
    const { year, month } = shiftMonth(this.data.year, this.data.month, Number(event.currentTarget.dataset.delta));
    const date = String(year) + '-' + String(month).padStart(2, '0') + '-01';
    if (parseDate(date)) this.select(date);
  },
  pick(event: WechatMiniprogram.TouchEvent) { this.select(event.currentTarget.dataset.date); },
  goToday() { this.select(today()); },
  interests() { wx.navigateTo({ url: '/pages/interests/index' }); },
  themes() { wx.navigateTo({ url: '/pages/themes/index' }); },
  detail() { wx.navigateTo({ url: '/pages/day-detail/index?date=' + this.data.date }); },
  share() { wx.navigateTo({ url: '/pages/share-card/index?date=' + this.data.date }); },
  note() { wx.navigateTo({ url: '/pages/note-editor/index?date=' + this.data.date }); },
});
