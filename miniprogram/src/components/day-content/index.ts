Component({
  properties: { cards: { type: Array, value: [] }, events: { type: Array, value: [] }, date: String, showAll: Boolean },
  methods: {
    newEvent() { wx.navigateTo({ url: '/pages/note-editor/index?date=' + this.data.date }); },
    editEvent(event: WechatMiniprogram.TouchEvent) {
      wx.navigateTo({ url: '/pages/note-editor/index?id=' + encodeURIComponent(event.currentTarget.dataset.id) });
    },
  },
});
