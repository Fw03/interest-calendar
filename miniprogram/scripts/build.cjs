const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

process.chdir(path.join(__dirname, '..'));
execFileSync(process.execPath, [require.resolve('typescript/bin/tsc')], { stdio: 'inherit' });

for (const file of fs.readdirSync('src', { recursive: true })) {
  const source = path.join('src', file);
  if (!fs.statSync(source).isFile() || !/\.(json|wxml|wxss|png)$/.test(file)) continue;
  const target = path.join('dist', file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

fs.mkdirSync('dist/vendor', { recursive: true });
fs.copyFileSync(require.resolve('lunar-javascript/lunar.js'), 'dist/vendor/lunar.js');
fs.copyFileSync(require.resolve('lunar-javascript/LICENSE'), 'dist/vendor/lunar-LICENSE.txt');

const localConfig = 'local.config.json';
const apiBase = fs.existsSync(localConfig) ? JSON.parse(fs.readFileSync(localConfig, 'utf8')).apiBase : '';
if (typeof apiBase !== 'string' || (apiBase && !/^(https:\/\/[^/?#@]+|http:\/\/(127\.0\.0\.1|localhost)(:\d+)?)(\/[^?#]*)?\/api\/v1$/.test(apiBase))) {
  throw new Error('apiBase 必须为 HTTPS API 地址或本机 HTTP 调试地址，结尾为 /api/v1');
}
fs.mkdirSync('dist/services', { recursive: true });
fs.writeFileSync('dist/services/config.js', 'module.exports = ' + JSON.stringify({ apiBase }) + ';\n');