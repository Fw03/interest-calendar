const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

test('微信导入配置与注册页面均有构建文件', () => {
  const config = require('../project.config.json');
  const root = path.resolve(__dirname, '..', config.miniprogramRoot);
  const repoConfig = require('../../project.config.json');
  assert.equal(path.resolve(__dirname, '../..', repoConfig.miniprogramRoot), root);
  const app = require(path.join(root, 'app.json'));
  for (const project of [config, repoConfig]) {
    assert.equal(project.projectname, '日有所喜');
  }
  assert.equal(app.window.navigationBarTitleText, '日有所喜');
  assert.equal(require(path.join(root, 'pages/calendar/index.json')).navigationBarTitleText, '日有所喜');
  for (const name of ['app.js', 'app.wxss', app.sitemapLocation]) {
    assert.ok(fs.existsSync(path.join(root, name)), name);
  }
  for (const page of app.pages) {
    for (const extension of ['js', 'wxml', 'wxss', 'json']) {
      assert.ok(fs.existsSync(path.join(root, page + '.' + extension)), page + '.' + extension);
    }
  }
  for (const tab of app.tabBar.list) {
    assert.ok(app.pages.includes(tab.pagePath));
    for (const icon of [tab.iconPath, tab.selectedIconPath].filter(Boolean)) {
      assert.ok(fs.existsSync(path.join(root, icon)), icon);
    }
  }
});
