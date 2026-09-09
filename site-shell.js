(() => {
  'use strict';

  const root = document.documentElement;
  const loader = document.getElementById('h5-loader');
  const bar = document.getElementById('h5-loader-bar');
  const label = document.getElementById('h5-loader-text');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (sessionStorage.getItem('h5-return-to-start') === '1') {
    sessionStorage.removeItem('h5-return-to-start');
    scrollTo(0, 0);
    addEventListener('pageshow', () => scrollTo(0, 0), {once: true});
  }

  // Hold the story's animation frames until the loading layer has left, so the
  // opening title sequence is never spent invisibly behind the loader.
  const nativeRaf = requestAnimationFrame.bind(window);
  const nativeCancelRaf = cancelAnimationFrame.bind(window);
  const heldFrames = new Map();
  let heldFrameId = -1;
  window.requestAnimationFrame = callback => {
    const id = heldFrameId--;
    heldFrames.set(id, callback);
    return id;
  };
  window.cancelAnimationFrame = id => {
    if (!heldFrames.delete(id)) nativeCancelRaf(id);
  };

  function releaseFrames() {
    window.requestAnimationFrame = nativeRaf;
    window.cancelAnimationFrame = nativeCancelRaf;
    const callbacks = Array.from(heldFrames.values());
    heldFrames.clear();
    callbacks.forEach(callback => nativeRaf(callback));
  }

  const criticalAssets = [
    './assets/opening.png',
    './assets/interaction/opening-clean-backdrop.png',
    './assets/interaction/layer-84.png',
    './assets/interaction/title-74-transparent.png',
    './assets/interaction/title-77-transparent.png',
    './assets/interaction/title-75-transparent.png'
  ];
  let finished = 0;

  function showProgress(value) {
    const progress = Math.max(0, Math.min(100, Math.round(value)));
    if (bar) bar.style.width = `${progress}%`;
    if (label) label.textContent = `正在加载 ${progress}%`;
  }

  function preload(src) {
    return new Promise(resolve => {
      const image = new Image();
      const done = () => {
        finished += 1;
        showProgress(finished / criticalAssets.length * 100);
        resolve();
      };
      image.onload = done;
      image.onerror = done;
      image.src = src;
    });
  }

  function delay(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
  }

  async function enterStory() {
    const minimum = delay(900);
    await Promise.race([
      Promise.all(criticalAssets.map(preload)),
      delay(8000)
    ]);
    await minimum;
    showProgress(100);
    root.classList.add('is-ready');
    await delay(reduced ? 0 : 380);
    root.classList.remove('is-loading', 'is-ready');
    if (loader) loader.hidden = true;
    releaseFrames();
    dispatchEvent(new CustomEvent('h5:ready'));
  }

  function mountReturnButton() {
    const ending = document.getElementById('extension-ending');
    if (!ending || ending.querySelector('.return-to-opening')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'return-to-opening';
    button.textContent = '点击返回开头';
    button.setAttribute('aria-label', '返回开头并重新播放');
    ending.append(button);

    let start = null;
    let dragged = false;
    button.addEventListener('pointerdown', event => {
      start = [event.clientX, event.clientY];
      dragged = false;
    }, {passive: true});
    button.addEventListener('pointermove', event => {
      if (start && Math.hypot(event.clientX-start[0], event.clientY-start[1]) > 10) dragged = true;
    }, {passive: true});
    button.addEventListener('pointercancel', () => {
      dragged = true;
      start = null;
    }, {passive: true});
    button.addEventListener('click', event => {
      if (event.detail !== 0 && dragged) return;
      button.disabled = true;
      if (label) label.textContent = '正在返回开头';
      if (bar) bar.style.width = '100%';
      if (loader) loader.hidden = false;
      root.classList.add('is-loading');
      sessionStorage.setItem('h5-return-to-start', '1');
      setTimeout(() => {
        scrollTo(0, 0);
        location.reload();
      }, reduced ? 0 : 360);
    });
  }

  document.addEventListener('DOMContentLoaded', mountReturnButton, {once: true});
  enterStory();
})();
