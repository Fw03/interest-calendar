import { InterestCode, Preferences, UserEvent } from '../types';
import { api, ApiError, connected } from './request';

type Session = { token: string; accountId: string; expiresAt: string };
type RemoteEvent = UserEvent & { version: number };
type Change =
  | { kind: 'settings'; value: Pick<Preferences, 'themeId' | 'zodiacSign'> }
  | { kind: 'interests'; value: InterestCode[] }
  | { kind: 'save'; event: UserEvent; mutationId: string }
  | { kind: 'delete'; id: string };
type AccountState = { preferences?: Preferences; version: number; events: RemoteEvent[]; queue: Change[]; conflict: boolean };

const sessionKey = 'youdian.session.v1';
let syncTask: Promise<void> | undefined;
let syncError = '';
let switching = false;
const defaults: Preferences = { themeId: 'cream', zodiacSign: '', selectedInterests: ['almanac', 'quote', 'note', 'zodiac'] };

export function currentAccount(): Session | undefined {
  if (!connected) return;
  const session = wx.getStorageSync(sessionKey) as Session | undefined;
  if (session?.accountId) return session;
}

export function accountToken() {
  const session = currentAccount();
  if (!session?.token || Date.parse(session.expiresAt) <= Date.now()) return '';
  return session.token;
}

function storageKey(session: Session) { return 'youdian.account.v1.' + session.accountId; }

function readState(session: Session): AccountState {
  return wx.getStorageSync(storageKey(session)) || { version: 0, events: [], queue: [], conflict: false };
}

function writeState(session: Session, state: AccountState) {
  wx.setStorageSync(storageKey(session), state);
}

function visibleState(state: AccountState) {
  let preferences = state.preferences || defaults;
  const events = new Map<string, UserEvent>(state.events.map((event) => [event.id, event]));
  for (const change of state.queue) {
    switch (change.kind) {
      case 'settings': preferences = { ...preferences, ...change.value }; break;
      case 'interests': preferences = { ...preferences, selectedInterests: change.value }; break;
      case 'save': events.set(change.event.id, change.event); break;
      case 'delete': events.delete(change.id); break;
    }
  }
  return { preferences, events: [...events.values()] };
}

export function accountData() {
  const session = currentAccount();
  if (session) return visibleState(readState(session));
}

export function accountStatus() {
  const session = currentAccount();
  if (!session) return { pending: 0, conflict: false, message: connected ? '未登录 · 当前设备' : '离线模式 · 当前设备' };
  const { queue, conflict } = readState(session);
  const message = !accountToken() ? '登录已失效，本机修改仍保留'
    : conflict ? '检测到跨设备修改，请在「我的」处理冲突'
    : syncError || (queue.length ? '已保存到本机，等待同步' : '微信账号同步已开启');
  return { pending: queue.length, conflict, message };
}

function enqueue(session: Session, ...changes: Change[]) {
  const state = readState(session);
  writeState(session, { ...state, queue: [...state.queue, ...changes] });
  void syncAccount(false);
}

export function queuePreferences(value: Preferences) {
  const session = currentAccount();
  if (!session) return false;
  const current = visibleState(readState(session)).preferences;
  const changes: Change[] = [];
  if (value.themeId !== current.themeId || value.zodiacSign !== current.zodiacSign) {
    changes.push({ kind: 'settings', value: { themeId: value.themeId, zodiacSign: value.zodiacSign } });
  }
  if (value.selectedInterests.join(',') !== current.selectedInterests.join(',')) {
    changes.push({ kind: 'interests', value: value.selectedInterests });
  }
  if (changes.length) enqueue(session, ...changes);
  return true;
}

export function queueEvent(event: UserEvent) {
  const session = currentAccount();
  if (!session) return false;
  const mutationId = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
  const { id, date, title, content, kind, completed } = event;
  enqueue(session, { kind: 'save', event: { id, date, title, content, kind, completed }, mutationId });
  return true;
}

export function queueDelete(id: string) {
  const session = currentAccount();
  if (!session) return false;
  enqueue(session, { kind: 'delete', id });
  return true;
}

async function snapshot(token: string) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const [prefs, interests, events] = await Promise.all([
      api<Pick<Preferences, 'themeId' | 'zodiacSign'> & { version: number }>('/users/me/preferences', 'GET', undefined, token),
      api<{ selectedInterests: InterestCode[]; version: number }>('/users/me/interests', 'GET', undefined, token),
      api<RemoteEvent[]>('/events', 'GET', undefined, token),
    ]);
    if (prefs.version === interests.version) {
      return { preferences: { themeId: prefs.themeId, zodiacSign: prefs.zodiacSign, selectedInterests: interests.selectedInterests },
        version: prefs.version, events };
    }
  }
  throw new ApiError(409, '云端偏好正在更新，请重试');
}

async function applyChange(state: AccountState, change: Change, token: string): Promise<Partial<AccountState>> {
  const preferences = state.preferences || defaults;
  if (change.kind === 'settings' || change.kind === 'interests') {
    const settings = change.kind === 'settings';
    const body = change.kind === 'settings' ? change.value : { selectedInterests: change.value };
    const result = await api<{ version: number }>(settings ? '/users/me/preferences' : '/users/me/interests',
      'PUT', { ...body, version: state.version }, token);
    return { version: result.version, preferences: { ...preferences, ...body } };
  }
  const id = change.kind === 'save' ? change.event.id : change.id;
  const existing = state.events.find((event) => event.id === id);
  const url = '/events/' + encodeURIComponent(id);
  const other = state.events.filter((event) => event.id !== id);
  if (change.kind === 'delete') {
    if (existing) {
      try {
        await api(url + '?version=' + existing.version, 'DELETE', undefined, token);
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 404) throw error;
      }
    }
    return { events: other };
  }
  try {
    const saved = await api<RemoteEvent>(existing ? url : '/events', existing ? 'PUT' : 'POST',
      { ...change.event, version: existing?.version, mutationId: change.mutationId }, token);
    return { events: [...other, saved] };
  } catch (error) {
    if (existing && error instanceof ApiError && error.status === 404) {
      throw new ApiError(409, '这条日程已在其他设备删除');
    }
    throw error;
  }
}

export async function syncAccount(pull = true): Promise<void> {
  const session = currentAccount();
  const token = accountToken();
  if (!session || !token || switching) return;
  if (syncTask) return syncTask;
  syncTask = (async () => {
    syncError = '';
    try {
      while (!switching) {
        const before = readState(session);
        if (before.conflict) return;
        if (!before.preferences || (pull && !before.queue.length)) {
          const remote = await snapshot(token);
          const latest = readState(session);
          if (!before.preferences || !latest.queue.length) writeState(session, { ...latest, ...remote });
          pull = false;
          continue;
        }
        const change = before.queue[0];
        if (!change) return;
        const result = await applyChange(before, change, token);
        const latest = readState(session);
        writeState(session, { ...latest, ...result, queue: latest.queue.slice(1) });
      }
    } catch (error) {
      const state = readState(session);
      if (error instanceof ApiError && error.status === 401) {
        wx.setStorageSync(sessionKey, { ...session, token: '' });
      } else if (error instanceof ApiError && error.status === 409 && state.queue.length && state.preferences) {
        writeState(session, { ...state, conflict: true });
      } else {
        syncError = state.queue.length ? '同步失败，本机修改已保留' : '云端暂不可用，显示本机数据';
      }
    }
  })();
  try { await syncTask; }
  finally { syncTask = undefined; }
}

export async function resolveConflict(keepLocal: boolean) {
  const session = currentAccount();
  const token = accountToken();
  if (!session || !token) throw new Error('请先登录');
  if (syncTask) await syncTask;
  switching = true;
  try {
    const remote = await snapshot(token);
    const state = readState(session);
    writeState(session, { ...state, ...remote, conflict: false, queue: keepLocal ? state.queue : [] });
  } finally { switching = false; }
  await syncAccount(false);
}

export async function signIn() {
  if (switching) return;
  switching = true;
  try {
    if (syncTask) await syncTask;
    const code = await new Promise<string>((resolve, reject) => wx.login({
      success(result) { result.code ? resolve(result.code) : reject(new Error('无法取得微信登录凭证')); },
      fail() { reject(new Error('微信登录失败，请重试')); },
    }));
    const session = await api<Session>('/auth/wechat/login', 'POST', { code });
    wx.setStorageSync(sessionKey, session);
  } finally { switching = false; }
  await syncAccount();
}

export async function signOut() {
  if (switching) return;
  switching = true;
  try {
    if (syncTask) await syncTask;
    const token = accountToken();
    if (token) await api('/auth/logout', 'POST', undefined, token);
    wx.removeStorageSync(sessionKey);
  } finally { switching = false; }
}

export function importGuest(preferences: Preferences, events: UserEvent[]) {
  const session = currentAccount();
  if (!session || !accountToken()) throw new Error('请先登录');
  const state = readState(session);
  if (!state.preferences || state.queue.length || state.conflict) throw new Error('请先同步云端数据');
  const existing = new Set(state.events.map((event) => event.id));
  const changes: Change[] = events.filter((event) => !existing.has(event.id))
    .map((event) => ({ kind: 'save', event, mutationId: event.id }));
  if (state.version === 0) {
    changes.push({ kind: 'settings', value: { themeId: preferences.themeId, zodiacSign: preferences.zodiacSign } },
      { kind: 'interests', value: preferences.selectedInterests });
  }
  if (changes.length) enqueue(session, ...changes);
}

export async function deleteAccount() {
  const session = currentAccount();
  const token = accountToken();
  if (!session || !token) throw new Error('请重新登录后删除账号数据');
  if (switching) throw new Error('账号正在切换，请重试');
  switching = true;
  try {
    if (syncTask) await syncTask;
    await api('/users/me', 'DELETE', { confirm: 'DELETE' }, token);
    wx.removeStorageSync(storageKey(session));
    wx.removeStorageSync(sessionKey);
  } finally { switching = false; }
}
