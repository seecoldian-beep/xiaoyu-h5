(() => {
  'use strict';
  const manifest = window.PSD_MANIFEST;
  const page = document.querySelector('#page');
  const canvas = document.querySelector('#design-canvas');
  const params = new URLSearchParams(location.search);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const staticMode = params.get('mode') === 'static';
  const imageLoads = [];
  function image(src, className, width, height) {
    const node = document.createElement('img');
    Object.assign(node, { className, width, height, alt: '', draggable: false, decoding: 'async' });
    imageLoads.push(new Promise((resolve, reject) => {
      node.addEventListener('load', resolve, { once: true });
      node.addEventListener('error', () => reject(new Error(`素材读取失败：${src}`)), { once: true });
    }));
    node.src = src;
    return node;
  }
  for (const scene of manifest.scenes) {
    const section = document.createElement('section');
    section.id = scene.slug;
    section.className = 'scene';
    section.setAttribute('aria-label', scene.name);
    section.dataset.psdGroupId = scene.sourceGroupId;
    section.style.setProperty('--scene-y', scene.y);
    section.style.setProperty('--scene-height', scene.height);
    section.append(image(scene.file, 'scene-final', scene.width, scene.height));
    canvas.append(section);
  }
  const bedroom = document.querySelector('#bedroom');
  const overlay = document.createElement('div');
  overlay.className = 'bedroom-animation';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.append(image('assets/bedroom/backdrop.png', 'bedroom-backdrop', 1080, 1926));
  for (const layer of manifest.bedroomLayers) {
    if (layer.id === 5 || layer.id === 8) continue;
    const node = image(layer.file, 'psd-layer', layer.width, layer.height);
    node.dataset.psdLayerId = layer.id;
    node.dataset.psdLayerName = layer.name;
    for (const [key, value] of Object.entries({
      x: layer.x, y: layer.y, width: layer.width, height: layer.height,
      z: layer.zIndex, opacity: layer.opacity,
    })) node.style.setProperty(`--psd-${key}`, value);
    if ([12, 10].includes(layer.id)) node.classList.add('actor');
    // Preserve each layer's stack index. Bubble and text share one pivot,
    // without reparenting either layer or changing the original coordinates.
    if ([14, 34, 13, 35].includes(layer.id)) {
      node.classList.add('bubble');
      const mom = [14, 34].includes(layer.id);
      const pivot = mom ? [773, 4319] : [264.5, 4511.5];
      node.style.transformOrigin = `${pivot[0] - layer.x}px ${pivot[1] - layer.y}px`;
      node.style.setProperty('--delay', mom ? '700ms' : '1200ms');
    }
    overlay.append(node);
  }
  bedroom.append(overlay);
  const trigger = document.createElement('span');
  trigger.className = 'scroll-trigger';
  trigger.setAttribute('aria-hidden', 'true');
  bedroom.append(trigger);
  function resize() {
    const scale = Math.min(page.clientWidth / manifest.width, 1);
    canvas.style.setProperty('--page-scale', scale);
    page.style.height = `${manifest.height * scale}px`;
  }
  resize();
  new ResizeObserver(resize).observe(page);
  let observer;
  function settle(state = 'complete') {
    // Transforms return to identity; the saved Photoshop composite preserves
    // the final dissolve blending and transparency rounding exactly.
    bedroom.dataset.state = state;
    observer?.disconnect();
  }
  function play() {
    if (bedroom.dataset.state !== 'pending') return;
    if (reducedMotion.matches) return settle('reduced-motion');
    bedroom.dataset.state = 'playing';
    observer?.disconnect();
    overlay.querySelector('[data-psd-layer-id="35"]').addEventListener('animationend', () => settle(), { once: true });
  }
  bedroom.dataset.state = staticMode ? 'static' : reducedMotion.matches ? 'reduced-motion' : 'pending';
  reducedMotion.addEventListener('change', event => { if (event.matches) settle('reduced-motion'); });
  Promise.all(imageLoads).then(() => {
    document.documentElement.dataset.assets = 'ready';
    if (!staticMode && !reducedMotion.matches) {
      observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) play();
      }, { rootMargin: '0px 0px -15% 0px' });
      observer.observe(trigger);
    }
    if (params.get('scene') === 'bedroom') bedroom.scrollIntoView({ block: 'start', behavior: 'instant' });
  }).catch(error => {
    settle('asset-error');
    document.documentElement.dataset.assets = 'error';
    console.error(error);
  });
})();
