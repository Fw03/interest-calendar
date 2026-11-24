const assert = require('node:assert/strict');
const test = require('node:test');
const { localShare, shareLookup, sharePath } = require('../dist/services/share');
const { drawPoster } = require('../dist/services/poster');

test('两个分享模板仅包含明确允许的公共内容', () => {
  const full = localShare('2026-11-21', 'daily', 'night');
  const quote = localShare('2026-11-21', 'quote', 'cream');
  assert.deepEqual(full.contents.map((card) => card.code), ['almanac', 'quote']);
  assert.deepEqual(quote.contents.map((card) => card.code), ['quote']);
  assert.deepEqual(Object.keys(full).sort(), ['contents', 'date', 'templateId', 'themeId']);
});

test('好友、朋友圈与海报入口使用有限格式的分享标识', () => {
  const token = 'a'.repeat(64);
  const scene = 'b'.repeat(32);
  assert.equal(sharePath(token), '/pages/share-landing/index?ref=friend&token=' + token);
  assert.equal(shareLookup({ token, ref: 'timeline' }), '/shares/' + token + '?ref=timeline');
  assert.equal(shareLookup({ scene }), '/shares/poster/' + scene);
  assert.equal(shareLookup({ token: '../events' }), '');
  assert.equal(shareLookup({ scene: '%broken' }), '');
});

test('无需微信凭证时 Canvas 会导出有明确标记的开发海报', async () => {
  const printed = [];
  const context = { fillRect() {}, fillText(value) { printed.push(value); }, measureText(value) { return { width: value.length * 21 }; } };
  const canvas = { getContext: () => context };
  global.wx = { canvasToTempFilePath({ canvas: actual, success }) {
    assert.equal(actual.width, 630);
    assert.equal(actual.height, 880);
    success({ tempFilePath: 'wxfile://poster.png' });
  } };
  assert.equal(await drawPoster(canvas, localShare('2026-11-21', 'daily', 'ink'), ''), 'wxfile://poster.png');
  assert.ok(printed.some((line) => line.includes('开发占位')));
});
