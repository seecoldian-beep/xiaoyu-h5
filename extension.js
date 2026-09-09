(() => {
  'use strict';

  const config = window.H5_EXTENSION;
  const motion = window.H5ExtensionMotion;
  const page = document.getElementById('page');
  const canvas = document.getElementById('design-canvas');
  if (!config || !motion || !page || !canvas) return;

  const params = new URLSearchParams(location.search);
  const staticMode = params.get('mode') === 'static';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches || params.get('motion') === 'reduce';
  const seen = Object.create(null);
  const renderers = [];
  const chartStates = [];
  let pageScale = 1;
  let frame = 0;
  let mobilePage = null;
  const interviewSlugs = new Set(['interview-intro', 'interview-one', 'interview-two', 'interview-three']);

  const extensionCanvas = document.createElement('div');
  page.classList.add('extension-enabled');
  extensionCanvas.id = 'extension-canvas';
  extensionCanvas.setAttribute('aria-label', '采访、数据与结尾');
  extensionCanvas.style.top = `${config.designStartY}px`;
  extensionCanvas.style.width = `${config.sourceWidth}px`;
  extensionCanvas.style.height = `${config.sourceEndY - config.sourceStartY}px`;
  extensionCanvas.style.transform = `scale(${config.scale})`;
  extensionCanvas.style.transformOrigin = '0 0';
  canvas.style.height = `${config.totalHeight}px`;

  const sceneNodes = new Map();
  for (const scene of config.scenes) {
    const section = document.createElement('section');
    section.id = `extension-${scene.slug}`;
    section.className = 'extension-scene';
    section.setAttribute('aria-label', scene.name);
    section.style.top = `${scene.y - config.sourceStartY}px`;
    section.style.height = `${scene.height}px`;

    const finalImage = document.createElement('img');
    finalImage.className = 'extension-final';
    finalImage.src = scene.finalFile;
    finalImage.alt = '';
    finalImage.width = config.sourceWidth;
    finalImage.height = scene.height;
    // 续页场景均预先加载，避免绝对定位与嵌套缩放让移动浏览器误判懒加载距离。
    finalImage.loading = 'eager';
    finalImage.decoding = 'async';
    finalImage.draggable = false;

    section.append(finalImage);
    extensionCanvas.append(section);
    sceneNodes.set(scene.slug, {scene, section, finalImage});
  }
  canvas.append(extensionCanvas);

  function setVisual(element, opacity, y = 0, scale = 1) {
    if (!element) return;
    const value = motion.clamp(opacity);
    const baseOpacity = Number(element.dataset.baseOpacity || 1);
    element.style.opacity = String(value * baseOpacity);
    element.style.transform = `translateY(${y || 0}px) scale(${scale})`;
  }

  function enhanceScene(slug) {
    const node = sceneNodes.get(slug);
    if (!node || staticMode) return null;

    const backdrop = document.createElement('img');
    backdrop.className = 'extension-backdrop';
    backdrop.src = node.scene.backdropFile;
    backdrop.alt = '';
    backdrop.width = config.sourceWidth;
    backdrop.height = node.scene.height;
    backdrop.decoding = 'async';
    backdrop.draggable = false;

    const stage = document.createElement('div');
    stage.className = 'extension-layer-stage';
    backdrop.addEventListener('error', () => node.section.classList.add('has-error'), {once: true});
    node.section.prepend(backdrop);
    node.section.append(stage);
    node.section.classList.add('is-enhanced');
    Object.assign(node, {backdrop, stage});
    return node;
  }

  function addLayer(slug, id) {
    const node = sceneNodes.get(slug);
    const row = config.layers[String(id)];
    if (!node?.stage || !row) return null;
    const image = document.createElement('img');
    image.className = 'extension-art-layer';
    image.dataset.layerId = String(id);
    image.dataset.baseOpacity = String(row.originalOpacity == null ? row.opacity / 255 : row.originalOpacity);
    image.src = row.file;
    image.alt = '';
    image.width = row.width;
    image.height = row.height;
    image.decoding = 'async';
    image.draggable = false;
    image.style.left = `${row.x}px`;
    image.style.top = `${row.y - node.scene.y}px`;
    image.style.width = `${row.width}px`;
    image.style.height = `${row.height}px`;
    image.style.zIndex = String(1100 - (row.zIndex || 0));
    image.addEventListener('error', () => node.section.classList.add('has-error'), {once: true});
    node.stage.append(image);
    return image;
  }

  function addLayers(slug, ids) {
    return ids.map(id => addLayer(slug, id)).filter(Boolean);
  }

  function clickWithoutDrag(button, action) {
    let start = null;
    let dragged = false;
    button.addEventListener('pointerdown', event => {
      start = [event.clientX, event.clientY];
      dragged = false;
    }, {passive: true});
    button.addEventListener('pointermove', event => {
      if (start && Math.hypot(event.clientX - start[0], event.clientY - start[1]) > 10) dragged = true;
    }, {passive: true});
    button.addEventListener('pointercancel', () => {
      dragged = true;
      start = null;
    }, {passive: true});
    button.addEventListener('click', event => {
      if (event.detail === 0 || !dragged) action();
      start = null;
    });
  }

  function sceneProgress(slug, start = .9, travel = .88) {
    if (reduced) return 1;
    if (params.get('qa') === '1' && params.get('scene') === slug && params.has('p')) {
      return motion.clamp(Number(params.get('p')));
    }
    if (mobilePage?.enabled && !interviewSlugs.has(slug)) {
      if (mobilePage.slug !== `extension-${slug}`) return seen[slug] || 0;
      const current = motion.clamp((performance.now() - mobilePage.startedAt) / 1700);
      seen[slug] = motion.advance(seen[slug] || 0, current);
      return seen[slug];
    }
    const scene = sceneNodes.get(slug).scene;
    const designY = config.designStartY + (scene.y - config.sourceStartY) * config.scale;
    const current = motion.scrollProgress({
      scrollY,
      sceneY: designY,
      scale: pageScale,
      viewportHeight: innerHeight,
      start,
      travel
    });
    seen[slug] = motion.advance(seen[slug] || 0, current);
    return seen[slug];
  }

  function buildInterviewIntro() {
    if (!enhanceScene('interview-intro')) return;
    const items = addLayers('interview-intro', [187, 236, 237]);
    renderers.push(() => {
      const progress = sceneProgress('interview-intro', .9, .8);
      items.forEach((item, index) => {
        const value = motion.phase(progress, index * .22, .42 + index * .22);
        setVisual(item, value, 14 * (1 - value));
      });
    });
  }

  function buildInterview(slug, houseId, textIds, connectorId) {
    if (!enhanceScene(slug)) return;
    const house = addLayer(slug, houseId);
    const text = addLayers(slug, textIds);
    const connector = addLayer(slug, connectorId);
    renderers.push(() => {
      const values = motion.interviewFrame(sceneProgress(slug, .92, 1.05));
      setVisual(house, values.house, 16 * (1 - values.house));
      text.forEach((item, index) => {
        const value = motion.phase(values.text, index * .11, Math.min(1, .7 + index * .11));
        setVisual(item, value, 10 * (1 - value), .98 + .02 * value);
      });
      setVisual(connector, values.connector, 10 * (1 - values.connector));
    });
  }

  function mountChart(slug, type, top, height, duration) {
    const node = sceneNodes.get(slug);
    if (!node?.stage || !window.H5Charts || !window.H5_CHARTS?.[type]) return;
    const shell = document.createElement('div');
    shell.className = `extension-chart-shell extension-chart-${type}`;
    shell.dataset.chartType = type;
    shell.style.left = '65px';
    shell.style.top = `${top}px`;
    shell.style.minHeight = `${height}px`;
    const controller = window.H5Charts.mount(shell, type, window.H5_CHARTS[type]);
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'extension-chart-trigger';
    trigger.textContent = window.H5Charts.TRIGGER_LABEL;
    shell.append(trigger);
    node.stage.append(shell);

    const state = {slug, type, shell, trigger, controller, duration, clicked: false, startedAt: 0, complete: false};
    clickWithoutDrag(trigger, () => {
      if (state.clicked) return;
      state.clicked = true;
      state.startedAt = performance.now();
      trigger.disabled = true;
      trigger.hidden = true;
      if (reduced) {
        controller.complete();
        state.complete = true;
      }
      schedule();
    });
    chartStates.push(state);
  }

  function buildCharts() {
    for (const slug of ['age-chart', 'usage-charts', 'health-chart', 'word-cloud']) enhanceScene(slug);
    const textGroups = [
      ['age-chart', [271, 529]],
      ['usage-charts', [273, 532]],
      ['health-chart', [450, 531]],
      ['word-cloud', [274, 680]]
    ].map(([slug, ids]) => [slug, addLayers(slug, ids)]);

    mountChart('age-chart', 'age', 310, 400, 2200);
    mountChart('usage-charts', 'screen-time', 300, 402, 1800);
    mountChart('usage-charts', 'phone-use', 735, 364, 2200);
    mountChart('health-chart', 'health', 360, 409, 2000);
    mountChart('word-cloud', 'word-cloud', 365, 526, 2200);

    renderers.push(() => {
      textGroups.forEach(([slug, items]) => {
        const value = motion.phase(sceneProgress(slug, .92, .7), 0, .42);
        items.forEach(item => setVisual(item, value, 12 * (1 - value)));
      });
    });
  }

  function updateCharts(now) {
    chartStates.forEach(state => {
      if (!state.clicked || state.complete) return;
      const rect = state.shell.getBoundingClientRect();
      if (rect.bottom < -32 || rect.top > innerHeight + 32) {
        state.controller.complete();
        state.complete = true;
        return;
      }
      const progress = reduced ? 1 : motion.phase(now - state.startedAt, 0, state.duration);
      state.controller.render(progress);
      if (progress >= 1) {
        state.controller.complete();
        state.complete = true;
      }
    });
  }

  function buildSimpleScene(slug, ids, starts) {
    if (!enhanceScene(slug)) return;
    const items = addLayers(slug, ids);
    if (slug === 'data-transition' && items[0]) {
      const scene = sceneNodes.get(slug).scene;
      const row = config.layers[String(ids[0])];
      items[0].style.left = `${(config.sourceWidth-row.width)/2}px`;
      items[0].style.top = `${(scene.height-row.height)/2}px`;
    }
    renderers.push(() => {
      const progress = sceneProgress(slug, .92, .82);
      items.forEach((item, index) => {
        const start = starts[index] || 0;
        const value = motion.phase(progress, start, Math.min(1, start + .34));
        setVisual(item, value, 14 * (1 - value), .98 + .02 * value);
      });
    });
  }

  function buildPolicyMap() {
    const node = enhanceScene('policy-map');
    if (!node) return;
    const heading = addLayer('policy-map', 276);
    const mapRoot = document.createElement('div');
    node.stage.append(mapRoot);
    const controller = window.H5PolicyMap?.mount(
      mapRoot,
      window.H5_WORLD_MAP,
      window.H5_POLICY_DATA
    );
    renderers.push(() => {
      const progress = sceneProgress('policy-map', .92, .92);
      const titleProgress = motion.phase(progress, 0, .34);
      setVisual(heading, titleProgress, 14 * (1 - titleProgress));
      controller?.render(motion.phase(progress, .18, 1));
    });
  }

  if (!staticMode) {
    buildInterviewIntro();
    buildInterview('interview-one', 240, [246, 242, 249], 248);
    buildInterview('interview-two', 257, [258, 259, 260], 256);
    buildInterview('interview-three', 261, [264, 265, 266], 263);
    buildSimpleScene('data-transition', [270], [0]);
    buildCharts();
    buildPolicyMap();
    buildSimpleScene('ending', [285, 283, 284], [0, .24, .68]);
  }

  function resizeExtension() {
    pageScale = Math.min(page.clientWidth / 1080, 1);
    page.style.setProperty('--extension-page-height', `${config.totalHeight * pageScale}px`);
    const sourceTouchSize = 44 / Math.max(pageScale * config.scale, .01);
    document.documentElement.style.setProperty('--extension-touch-size', `${sourceTouchSize}px`);
    document.documentElement.style.setProperty('--extension-touch-half', `${-sourceTouchSize / 2}px`);
    schedule();
  }

  function render(now) {
    frame = 0;
    renderers.forEach(renderer => renderer());
    updateCharts(now);
    if (mobilePage?.enabled && mobilePage.slug.startsWith('extension-')) {
      const slug = mobilePage.slug.slice('extension-'.length);
      if (!interviewSlugs.has(slug) && (seen[slug] || 0) < 1) schedule();
    }
    if (chartStates.some(state => state.clicked && !state.complete)) schedule();
  }

  function schedule() {
    if (!frame && !staticMode) frame = requestAnimationFrame(render);
  }

  resizeExtension();
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(resizeExtension).observe(page);
  window.addEventListener('resize', resizeExtension, {passive: true});
  window.addEventListener('orientationchange', resizeExtension, {passive: true});
  window.addEventListener('scroll', schedule, {passive: true});
  window.addEventListener('h5:pagechange', event => {
    const detail = event.detail || {};
    mobilePage = {
      enabled: Boolean(detail.mobile),
      slug: detail.slug || '',
      startedAt: Number(detail.startedAt) || performance.now()
    };
    schedule();
  });

  const selected = sceneNodes.get(params.get('scene'));
  if (params.get('qa') === '1' && selected) {
    requestAnimationFrame(() => {
      const pageScale = Math.min(page.clientWidth / 1080, 1);
      const designY = config.designStartY + (selected.scene.y - config.sourceStartY) * config.scale;
      scrollTo(0, designY * pageScale);
      schedule();
    });
  }

  schedule();
  window.__H5_EXTENSION_QA__ = {config, extensionCanvas, sceneNodes, seen, chartStates, resizeExtension};
})();
