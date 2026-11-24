const assert = require('node:assert/strict');
const test = require('node:test');

const config = require('../dist/services/config');
config.apiBase = 'https://calendar.example/api/v1';
const account = require('../dist/services/account');
const preferences = require('../dist/stores/preferences');
const events = require('../dist/stores/events');
const { cachedDaily, fetchDaily } = require('../dist/services/public-content');

test('账号保存重读、断网队列、并发冲突及换号隔离', async () => {
  const storage = new Map();
  const accounts = new Map(['alice', 'bob'].map((id) => [id, {
    prefs: { themeId: 'cream', zodiacSign: '', version: 0 },
    interests: ['almanac', 'quote', 'note', 'zodiac'],
    events: [],
  }]));
  let login = 'alice';
  let offline = false;
  let dailyReads = 0;
  global.wx = {
    getStorageSync(key) { return structuredClone(storage.get(key)); },
    setStorageSync(key, value) { storage.set(key, structuredClone(value)); },
    removeStorageSync(key) { storage.delete(key); },
    login({ success }) { success({ code: login }); },
    request({ url, method, header, data, success, fail }) {
      queueMicrotask(() => {
        if (offline) return fail();
        const path = new URL(url).pathname.replace('/api/v1', '');
        const reply = (result) => success({ statusCode: 200, data: { code: 0, data: structuredClone(result) } });
        const error = (statusCode) => success({ statusCode, data: { code: statusCode } });
        if (path === '/calendar/daily') {
          dailyReads++;
          return reply({ contents: [{ code: 'quote', payload: { text: '服务端公开内容' } }] });
        }
        if (path === '/auth/wechat/login') return reply({ token: data.code, accountId: data.code, expiresAt: '2099-12-31' });
        const current = accounts.get(header.Authorization?.slice(7));
        if (!current) return error(401);
        if (path === '/auth/logout') return reply(null);
        if (path === '/users/me/preferences') {
          if (method === 'PUT') {
            if (data.version !== current.prefs.version) return error(409);
            current.prefs = { themeId: data.themeId, zodiacSign: data.zodiacSign, version: data.version + 1 };
          }
          return reply(current.prefs);
        }
        if (path === '/users/me/interests') {
          if (method === 'PUT') {
            if (data.version !== current.prefs.version) return error(409);
            current.interests = data.selectedInterests;
            current.prefs.version++;
          }
          return reply({ selectedInterests: current.interests, version: current.prefs.version });
        }
        if (path === '/events' && method === 'GET') return reply(current.events);
        if (path === '/events' && method === 'POST') {
          const { mutationId, ...fields } = data;
          const saved = { ...fields, version: 1 };
          current.events.push(saved);
          return reply(saved);
        }
        return error(404);
      });
    },
  };

  await fetchDaily('2026-11-21');
  await fetchDaily('2026-11-21');
  assert.equal(dailyReads, 1);
  assert.equal(cachedDaily('2026-11-21')[0].payload.text, '服务端公开内容');
  events.saveEvent({ ...events.newEvent('2026-11-21'), title: '离线访客' });
  await account.signIn();
  assert.deepEqual(events.allEvents(), []);

  offline = true;
  preferences.savePreferences({ ...preferences.readPreferences(), themeId: 'night', selectedInterests: ['quote', 'note'] });
  events.saveEvent({ ...events.newEvent('2026-11-21'), title: '只属于 Alice' });
  await account.syncAccount();
  assert.equal(account.accountStatus().pending, 3);
  assert.match(account.accountStatus().message, /本机修改已保留/);
  assert.equal(preferences.readPreferences().themeId, 'night');
  assert.equal(events.eventsFor('2026-11-21')[0].title, '只属于 Alice');

  offline = false;
  await account.syncAccount();
  assert.equal(account.accountStatus().pending, 0);
  assert.equal(accounts.get('alice').prefs.themeId, 'night');
  assert.deepEqual(accounts.get('alice').interests, ['quote', 'note']);
  storage.delete('youdian.account.v1.alice');
  await account.syncAccount();
  assert.equal(events.eventsFor('2026-11-21')[0].title, '只属于 Alice');
  assert.equal(preferences.readPreferences().themeId, 'night');

  accounts.get('alice').prefs = { themeId: 'mint', zodiacSign: '', version: 3 };
  preferences.savePreferences({ ...preferences.readPreferences(), themeId: 'ink' });
  await account.syncAccount();
  assert.equal(account.accountStatus().conflict, true);
  assert.equal(preferences.readPreferences().themeId, 'ink');
  await account.resolveConflict(true);
  assert.equal(accounts.get('alice').prefs.themeId, 'ink');
  assert.equal(account.accountStatus().conflict, false);

  login = 'bob';
  await account.signIn();
  assert.equal(preferences.readPreferences().themeId, 'cream');
  assert.deepEqual(events.allEvents(), []);
  await account.signOut();
  assert.equal(events.allEvents()[0].title, '离线访客');
});
