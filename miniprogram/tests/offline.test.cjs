const assert = require('node:assert/strict');
const test = require('node:test');
const { dayInfo, monthGrid, parseDate, shiftMonth, today } = require('../dist/utils/date');
const { moveInterest, readPreferences, savePreferences } = require('../dist/stores/preferences');
const { allEvents, deleteEvent, eventsFor, newEvent, saveEvent } = require('../dist/stores/events');
const { cardsFor } = require('../dist/mock/content');

const memory = new Map();
global.wx = {
  getStorageSync(key) { return structuredClone(memory.get(key)); },
  setStorageSync(key, value) { memory.set(key, structuredClone(value)); },
};

test('星期、跨年、闰日和系统本地日期', () => {
  assert.equal(parseDate('2026-11-21').weekday, 6);
  assert.equal(parseDate('2026-11-01').weekday, 0);
  assert.equal(parseDate('2026-02-29'), undefined);
  assert.equal(parseDate('2028-02-29').day, 29);
  assert.deepEqual(shiftMonth(2026, 12, 1), { year: 2027, month: 1 });
  assert.equal(monthGrid(2027, 1, '2026-12-31')[0].date, '2026-12-27');
  assert.equal(today(new Date(2027, 0, 1, 0, 1)), '2027-01-01');
});

test('农历春节与冬至', () => {
  assert.equal(dayInfo('2026-02-17').lunarLabel, '正月');
  assert.equal(dayInfo('2026-12-22').solarTerm, '冬至');
});

test('主题与兴趣重读、去重、停用与排序', () => {
  const selectedInterests = moveInterest(['quote', 'music', 'almanac'], 'almanac', -1).filter((code) => code !== 'music');
  savePreferences({ themeId: 'night', zodiacSign: '', selectedInterests: [...selectedInterests, 'quote'] });
  const prefs = readPreferences();
  assert.equal(prefs.themeId, 'night');
  assert.deepEqual(cardsFor('2026-11-21', prefs).map((card) => card.code), ['quote', 'almanac']);
});

test('本地日程日期隔离、编辑待办、删除', () => {
  const event = { ...newEvent('2026-11-21'), title: '私密备注', content: '仅自己可见' };
  saveEvent(event);
  assert.equal(eventsFor('2026-11-22').length, 0);
  assert.equal(eventsFor(event.date)[0].title, event.title);
  saveEvent({ ...event, kind: 'todo', completed: true, date: '2026-11-22' });
  assert.equal(eventsFor(event.date).length, 0);
  assert.equal(eventsFor('2026-11-22')[0].completed, true);
  deleteEvent(event.id);
  assert.equal(allEvents().length, 0);
});
