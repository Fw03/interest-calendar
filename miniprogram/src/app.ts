import { syncAccount } from './services/account';

App({
  onLaunch() {
    wx.onNetworkStatusChange(({ isConnected }) => { if (isConnected) void syncAccount(); });
  },
  onShow() { void syncAccount(); },
});
