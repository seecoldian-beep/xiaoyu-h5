(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.H5ExtensionMotion = api;
}(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  const clamp = value => Math.max(0, Math.min(1, Number(value) || 0));
  const phase = (value, start, end) => {
    const progress = clamp((value - start) / (end - start));
    return progress * progress * (3 - 2 * progress);
  };
  const advance = (seen, current) => Math.max(clamp(seen), clamp(current));

  function interviewFrame(progress) {
    return {
      house: phase(progress, 0.06, 0.34),
      text: phase(progress, 0.36, 0.72),
      connector: phase(progress, 0.74, 1)
    };
  }

  function scrollProgress({scrollY, sceneY, scale, viewportHeight, start = 0.86, travel = 0.68}) {
    const viewportTop = sceneY * scale - scrollY;
    return clamp((viewportHeight * start - viewportTop) / (viewportHeight * travel));
  }

  return {clamp, phase, advance, interviewFrame, scrollProgress};
}));
