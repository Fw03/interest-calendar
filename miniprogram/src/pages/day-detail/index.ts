import { syncAccount } from '../../services/account';
import { cachedDaily, fetchDaily } from '../../services/public-content';
import { cardsFor } from '../../mock/content';
import { eventsFor } from '../../stores/events';
import { readPreferences } from '../../stores/preferences';
import { applyTheme } from '../../themes/tokens';
import { dayInfo, today } from '../../utils/date';

Page({
  data: { date: today(), theme: '', publicError: false, selected: dayInfo(today()), cards: [] as ReturnType<typeof cardsFor>, events: [] as ReturnType<typeof eventsFor> },
  onLoad(options) {
    const date = options.date || today();
    if (dayInfo(date)) this.setData({ date });
  },
  onShow() {
    this.render();
    void syncAccount().then(() => this.render());
    void fetchDaily(this.data.date).then(() => this.render()).catch(() => this.setData({ publicError: true }));
  },
  render() {
    const { date } = this.data;
    this.setData({ theme: applyTheme(), selected: dayInfo(date), cards: cardsFor(date, readPreferences(), cachedDaily(date)), events: eventsFor(date) });
  },
});
