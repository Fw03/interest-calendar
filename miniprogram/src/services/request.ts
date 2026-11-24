declare function require(path: string): unknown;
const { apiBase } = require('./config') as { apiBase: string };

export const connected = Boolean(apiBase);

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function api<T>(
  path: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  data?: WechatMiniprogram.IAnyObject, token = '',
): Promise<T> {
  if (!connected) return Promise.reject(new ApiError(0, '当前为离线模式'));
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiBase + path, method, data, timeout: 6000,
      header: token ? { Authorization: 'Bearer ' + token } : {},
      success(response) {
        const body = response.data as { code?: number; message?: string; data?: T } | null;
        if (response.statusCode >= 200 && response.statusCode < 300 && body?.code === 0) {
          resolve(body.data as T);
        } else {
          reject(new ApiError(response.statusCode, body?.message || '服务暂时不可用'));
        }
      },
      fail() { reject(new ApiError(0, '网络不可用，请稍后重试')); },
    });
  });
}
