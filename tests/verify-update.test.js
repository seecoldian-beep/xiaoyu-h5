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
const shell = read('site-shell.js');
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
assert.match(app, /narrativeMobileDuration\s*=\s*3600/, '卧室、教室和放学路对话应明显放慢');
assert.match(app, /replyDuration\s*=\s*1100/, '点击后的回复气泡应以约 1.1 秒渐显');
assert.match(app, /__H5_OPENING_INTERACTIONS_READY__\s*=\s*Promise\.all/, '进入故事前应预加载开头五个分层场景');
assert.match(app, /try\s*{\s*await node\.decode\(\)/, 'iOS 图片解码失败时应允许回退到正常加载检测');
assert.match(app, /mobilePage\.startedAt\s*=\s*performance\.now\(\)/, '移动端动画计时必须从当前场景素材就绪后开始');
assert.match(app, /mobilePage\.startedAt\s*!==\s*null/, '素材未就绪时不得在后台耗尽场景动画');
assert.match(shell, /await Promise\.race\(\[openingInteractionsReady, delay\(8000\)\]\)/, '加载页应等待开头交互素材准备完成');

const extension = read('extension.js');
assert.match(extension, /interview-underline/, '三位家长页应包含重点句划线动画');
assert.match(extension, /向下滑动/, '采访引入页应包含向下滑动指引');
assert.match(extension, /playUnderlineSound/, '采访重点线应带有模拟划线音效');
assert.match(extension, /underlineDrawDuration\s*=\s*720/, '采访重点线应使用独立计时绘制，避免滚动时瞬间完成');
assert.match(extension, /underlinePlayed\[index\]\s*=\s*playUnderlineSound/, '划线音效应在音频解锁后可靠触发');
assert.ok(fs.existsSync(path.join(root, 'assets/audio/h5-voice-48s.mp3')), '应包含前 48 秒配音文件');

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
assert.match(mapCode, /policy-map\.html\?country=/, 'H5 地图国家点应链接到完整地图页');
assert.doesNotMatch(mapCode, /policy-sheet/, 'H5 地图不得再创建会滞留的固定浮窗');
assert.ok(fs.existsSync(path.join(root, 'policy-map.html')), '应提供独立完整政策地图页');

console.log('H5 update checks passed.');
