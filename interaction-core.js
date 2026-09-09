(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.H5Motion = api;
}(typeof window !== 'undefined' ? window : this, function () {
  'use strict';
  const clamp = value => Math.max(0, Math.min(1, value));
  const phase = (p, start, end) => {
    const t = clamp((p - start) / (end - start));
    return t * t * (3 - 2 * t);
  };
  const advance = (seen, current) => Math.max(clamp(seen), clamp(current));
  const bubbleScale = opacity => 0.98 + 0.02 * opacity;
  function openingFrame(milliseconds) {
    // 每行下落 1 秒，行间留 0.3 秒停顿；所有位移最终归零。
    return [74, 77, 75].map((id, index) => {
      const opacity = phase(milliseconds, 200 + index * 1300, 1200 + index * 1300);
      return {id, opacity, y: -60 * (1-opacity) || 0};
    });
  }
  function narrativeFrame(p, replyMilliseconds = null) {
    const environmentOpacity = phase(p, 0, 0.30);
    const replyAvailable = p >= 0.75;
    return {
      environmentOpacity,
      environmentY: -80 * (1 - environmentOpacity) || 0,
      characters: phase(p, 0.34, 0.54),
      dialogueOne: phase(p, 0.58, 0.75),
      replyAvailable,
      dialogueTwo: replyAvailable && replyMilliseconds !== null ? phase(replyMilliseconds, 0, 600) : 0
    };
  }
  function scrollProgress({scrollY, sceneY, interactionTop, scale, viewportHeight, characterDelta = 0}) {
    const distance = viewportHeight * 0.40;
    const startLine = Math.min(viewportHeight * 0.50,
      viewportHeight - 50 - characterDelta * scale + 0.34 * distance);
    const anchor = (sceneY + interactionTop) * scale - scrollY;
    return clamp((startLine - anchor) / distance);
  }
  function phoneFrame(milliseconds) {
    return {
      shell: 1 - phase(milliseconds, 0, 300),
      zoom: phase(milliseconds, 100, 1000),
      source: 1 - phase(milliseconds, 220, 1000),
      destination: phase(milliseconds, 180, 1000),
      character: phase(milliseconds, 1000, 1550),
      messages: [1650, 2150, 2650, 3150, 3650].map(start => phase(milliseconds, start, start + 350))
    };
  }
  function phoneHandoff(travel, lift, initialScale, availableTravel = lift) {
    const distance = Math.min(lift, availableTravel);
    const progress = distance > 0 ? clamp(travel / distance) : 1;
    return { offsetY: -lift * (1 - progress) || 0,
      scale: initialScale + (1 - initialScale) * progress };
  }
  return {clamp, phase, advance, bubbleScale, openingFrame, narrativeFrame, scrollProgress, phoneFrame, phoneHandoff};
}));
