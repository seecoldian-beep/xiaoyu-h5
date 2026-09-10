const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const hash = file => crypto.createHash('sha256')
  .update(fs.readFileSync(path.join(root, file)))
  .digest('hex');

const app = read('app-interactions.js');
const pager = read('mobile-pager.js');
const chartData = read('assets/extension/charts-data.js');
const mapData = read('assets/extension/map-update.js');
const mapCode = read('extension-map.js');

assert.match(
  app,
  /scene\.ready\s*&&\s*!scene\.failed\s*\?\s*'layers'\s*:\s*'final'/,
  '动态素材未解码前保留静态图，完成后也不得换图造成闪动'
);
assert.match(app, /introductionMobileDuration\s*=\s*5200/, '小羽介绍页应放慢到约 5.2 秒');

const extension = read('extension.js');
assert.match(extension, /interview-underline/, '三位家长页应包含重点句划线动画');
assert.match(extension, /向下滑动/, '采访引入页应包含向下滑动指引');

assert.doesNotMatch(
  pager,
  /fade\.classList\.add\('is-visible'\)/,
  '移动端翻页不得启用全屏闪层'
);
assert.match(
  pager,
  /Math\.abs\(scrollY-lockedScrollY\)\s*>\s*1/,
  '独立翻页场景必须抵消按钮聚焦造成的自动滚动'
);

assert.equal(
  hash('assets/extension/charts/screen-time.svg'),
  'b60e9f6a41b9ea8826aa4b551541a2e3bf539f6afcb50e2c2e0f58deda9e4220',
  '平均设备使用时间图应为 2026-09-09 新版'
);

assert.equal(
  hash('assets/extension/charts/health.svg'),
  '160683d7b2edae2171a51e2ce6bef51540db688b5dd475dfafdf15ec2ddb1b36',
  '健康风险图应为 2026-09-09 新版'
);

assert.ok(chartData.includes('x1=\\\"168.18373335494996\\\"'), '内嵌折线图数据应来自新版 SVG');
assert.ok(chartData.includes('fill=\\\"#F3EFD8\\\"'), '内嵌健康图数据应使用新版基准色');

for (const country of ['澳大利亚', '印度尼西亚', '法国', '英国', '新西兰', '丹麦', '德国', '美国']) {
  assert.ok(mapData.includes(`name: '${country}'`), `地图应包含${country}`);
}
assert.ok(!mapData.includes("name: '欧盟'"), '新版地图不再将欧盟作为国家点位');
for (const color of ['#2c5c8a', '#4f7ba4', '#7aa0c4', '#a9c2d9']) {
  assert.ok(mapData.includes(color), `地图应使用新版政策色 ${color}`);
}
assert.match(mapCode, /isPointInFill/, '地图应把政策颜色应用到对应国家轮廓');

console.log('H5 update checks passed.');
