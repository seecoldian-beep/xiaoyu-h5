(function () {
  'use strict';

  const TRIGGER_LABEL = '点击查看数据';
  const TYPE_NAMES = ['age', 'screen-time', 'phone-use', 'health', 'word-cloud'];
  const clamp = value => Math.max(0, Math.min(1, Number(value) || 0));
  const localPhase = (value, start, end) => {
    const p = clamp((value - start) / (end - start));
    return p * p * (3 - 2 * p);
  };

  function setReveal(nodes, progress, travel, lift) {
    const list = Array.from(nodes);
    list.forEach((node, index) => {
      const start = list.length > 1 ? index / list.length * travel : 0;
      const p = localPhase(progress, start, Math.min(1, start + 1 - travel));
      node.style.opacity = String(p);
      node.style.transformBox = 'fill-box';
      node.style.transformOrigin = '50% 50%';
      node.style.transform = `translateY(${(1 - p) * (lift || 10)}px) scale(${.97 + p * .03})`;
    });
  }

  function setLine(nodes, progress) {
    Array.from(nodes).forEach(node => {
      let length = 1200;
      try { length = node.getTotalLength(); } catch (error) { /* 保留图表文本兜底 */ }
      node.style.opacity = String(progress);
      node.style.strokeDasharray = `${length}`;
      node.style.strokeDashoffset = `${length * (1 - progress)}`;
    });
  }

  function groups(svg, selector, fallback) {
    const found = svg.querySelectorAll(selector);
    return found.length ? found : svg.querySelectorAll(fallback || selector);
  }

  function renderAge(svg, p) {
    setReveal(groups(svg, '.column-plot .column-group', '.column-plot rect'), localPhase(p, 0, .72), .42, 16);
    setReveal(groups(svg, '.column-texts .text-group', '.column-texts text'), localPhase(p, .48, 1), .35, 7);
  }

  function renderScreenTime(svg, p) {
    setReveal(groups(svg, '.column-plot .column-group', '.column-plot rect'), localPhase(p, 0, .48), .3, 14);
    setLine(groups(svg, '.line-plot .line', '.line-plot path'), localPhase(p, .32, .76));
    setReveal(groups(svg, '.line-plot .circle', '.line-plot circle'), localPhase(p, .56, .9), .25, 5);
    setReveal(groups(svg, '.column-texts .text-group, .line-texts .text-group', '.column-texts text, .line-texts text'), localPhase(p, .7, 1), .24, 5);
  }

  function renderPhoneUse(svg, p) {
    setReveal(groups(svg, '.symbol-bar-plot .icon-group', '.symbol-bar-plot path'), localPhase(p, 0, .78), .55, 14);
    setReveal(groups(svg, '.text-container .text-group', '.text-container text'), localPhase(p, .55, 1), .35, 6);
  }

  function renderHealth(svg, p) {
    setReveal(groups(svg, '.bar-plot .bar-group', '.bar-plot rect'), localPhase(p, 0, .48), .28, 12);
    setReveal(groups(svg, '.difference-arrow-bar-plot .arrow-group', '.difference-arrow-bar-plot path'), localPhase(p, .36, .8), .36, 10);
    setReveal(groups(svg, '.bar-texts .text-group', '.bar-texts text'), localPhase(p, .62, 1), .28, 5);
  }

  function renderWordCloud(svg, p) {
    const words = Array.from(groups(svg, '.word-cloud .word-text', '.word-cloud text'));
    const ranked = words.map(node => ({
      node,
      size: Number(node.getAttribute('font-size')) || Number.parseFloat(node.style.fontSize) || 12
    })).sort((a, b) => b.size - a.size);
    const large = ranked.slice(0, Math.max(8, Math.round(ranked.length * .12))).map(x => x.node);
    const medium = ranked.slice(large.length, Math.round(ranked.length * .45)).map(x => x.node);
    const small = ranked.slice(large.length + medium.length).map(x => x.node);
    setReveal(large, localPhase(p, 0, .42), .25, 8);
    setReveal(medium, localPhase(p, .26, .75), .45, 8);
    setReveal(small, localPhase(p, .58, 1), .72, 6);
  }

  const renderers = {
    age: renderAge,
    'screen-time': renderScreenTime,
    'phone-use': renderPhoneUse,
    health: renderHealth,
    'word-cloud': renderWordCloud
  };

  function mount(host, type, markup) {
    if (!TYPE_NAMES.includes(type)) throw new Error(`Unknown chart type: ${type}`);
    host.insertAdjacentHTML('afterbegin', markup);
    const svg = host.querySelector('svg');
    if (!svg) throw new Error(`Missing SVG for ${type}`);
    const sourceWidth = Number.parseFloat(svg.getAttribute('width'));
    const sourceHeight = Number.parseFloat(svg.getAttribute('height'));
    if (!svg.getAttribute('viewBox') && sourceWidth > 0 && sourceHeight > 0) {
      svg.setAttribute('viewBox', `0 0 ${sourceWidth} ${sourceHeight}`);
    }
    svg.removeAttribute('width');
    svg.removeAttribute('height');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.setAttribute('focusable', 'false');
    svg.setAttribute('aria-hidden', 'true');
    const render = progress => renderers[type](svg, clamp(progress));
    render(0);
    return {
      render,
      complete() {
        render(1);
        host.setAttribute('data-chart-complete', 'true');
      }
    };
  }

  window.H5Charts = {TRIGGER_LABEL, TYPE_NAMES, mount};
}());
