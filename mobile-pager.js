(() => {
  'use strict';

  const root = document.documentElement;
  const page = document.getElementById('page');
  const mobile = matchMedia('(max-width: 600px)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const params = new URLSearchParams(location.search);
  if (!page || params.get('qa') === '1' || params.get('mode') === 'static') return;

  const pages = [
    {id:'opening', color:'#868e95'},
    {id:'introduction', color:'#878e95'},
    {id:'bedroom', color:'#878e95'},
    {id:'classroom', color:'#868e95'},
    {id:'school-road', color:'#9ba1a7'},
    {id:'transition', color:'#878689'},
    {id:'extension-interview-intro', mode:'interviews', end:'extension-interview-three'},
    {id:'extension-data-transition', color:'#94999f', align:'center'},
    {id:'extension-age-chart', color:'#868e95'},
    {id:'extension-usage-charts', color:'#b5aea0'},
    {id:'extension-health-chart', color:'#878e96'},
    {id:'extension-word-cloud', color:'#899097'},
    {id:'extension-policy-map', color:'#b5aea0'},
    {id:'extension-ending', color:'#878d95'}
  ];

  let index = 0;
  let enabled = false;
  let transitioning = false;
  let touch = null;
  let wheelTotal = 0;
  let wheelTimer = 0;
  let lockedScrollY = 0;

  const fade = document.createElement('div');
  fade.id = 'h5-page-fade';
  fade.setAttribute('aria-hidden', 'true');
  const maskTop = document.createElement('div');
  maskTop.id = 'h5-page-mask-top';
  maskTop.setAttribute('aria-hidden', 'true');
  const maskBottom = document.createElement('div');
  maskBottom.id = 'h5-page-mask-bottom';
  maskBottom.setAttribute('aria-hidden', 'true');
  document.body.append(maskTop, maskBottom, fade);

  const current = () => pages[index];
  const elementFor = item => document.getElementById(item.id);
  const pageTop = element => element.getBoundingClientRect().top + scrollY;
  const pageHeight = element => element.getBoundingClientRect().height;

  function interviewBounds() {
    const item = pages.find(value => value.mode === 'interviews');
    const first = elementFor(item);
    const last = document.getElementById(item.end);
    if (!first || !last) return {start:0, end:0, max:0};
    const start = pageTop(first);
    const end = pageTop(last) + pageHeight(last);
    return {start, end, max:Math.max(start, end-innerHeight)};
  }

  function targetScroll(item, direction = 1) {
    if (item.mode === 'interviews') {
      const bounds = interviewBounds();
      return direction < 0 ? bounds.max : bounds.start;
    }
    const element = elementFor(item);
    if (!element) return scrollY;
    const gap = item.align === 'center' ? Math.max(0, (innerHeight-pageHeight(element))/2) : 0;
    return Math.max(0, pageTop(element)-gap);
  }

  function updateMasks() {
    if (!enabled || current().mode === 'interviews') return;
    const element = elementFor(current());
    if (!element) return;
    const rect = element.getBoundingClientRect();
    maskTop.style.height = current().align === 'center'
      ? `${Math.max(0, Math.min(innerHeight, rect.top))}px`
      : '0px';
    maskBottom.style.height = `${Math.max(0, Math.min(innerHeight, innerHeight-rect.bottom))}px`;
    root.style.setProperty('--h5-page-edge', current().color || '#878e95');
  }

  function announce() {
    const item = current();
    dispatchEvent(new CustomEvent('h5:pagechange', {detail:{
      mobile:true,
      index,
      slug:item.id,
      mode:item.mode || 'page',
      startedAt:performance.now()
    }}));
  }

  function setMode(item) {
    root.classList.toggle('h5-interview-flow', item.mode === 'interviews');
    // Keep document scrolling enabled at all times. Ordinary pages are locked
    // by touch handling; the interview block simply switches to native pan-y.
    void root.offsetHeight;
  }

  function jumpTo(item, direction) {
    setMode(item);
    lockedScrollY = targetScroll(item, direction);
    scrollTo(0, lockedScrollY);
    updateMasks();
    announce();
  }

  function turnTo(nextIndex, direction) {
    if (!enabled || transitioning || nextIndex < 0 || nextIndex >= pages.length) return;
    transitioning = true;
    index = nextIndex;
    jumpTo(current(), direction);
    // 保留输入锁，确保一次手势只翻一页；不再覆盖全屏闪层。
    const lockDuration = reduced.matches ? 120 : 420;
    setTimeout(() => { transitioning = false; }, lockDuration);
  }

  function next() { turnTo(index+1, 1); }
  function previous() { turnTo(index-1, -1); }

  function clampInterviewScroll() {
    if (!enabled || current().mode !== 'interviews' || transitioning) return;
    const bounds = interviewBounds();
    if (scrollY < bounds.start-1) scrollTo(0, bounds.start);
    else if (scrollY > bounds.max+1) scrollTo(0, bounds.max);
  }

  function onTouchStart(event) {
    if (!enabled || transitioning || event.touches.length !== 1 || document.querySelector('.policy-sheet.is-open')) return;
    const point = event.touches[0];
    touch = {x:point.clientX, y:point.clientY, at:scrollY};
  }

  function onTouchMove(event) {
    if (!touch || !enabled || transitioning) return;
    const point = event.touches[0];
    const dx = point.clientX-touch.x;
    const dy = point.clientY-touch.y;
    if (Math.abs(dy) <= Math.abs(dx)) return;
    event.preventDefault();
    if (current().mode === 'interviews') {
      // Follow the finger directly instead of depending on Safari to restore
      // native scrolling after several locked full-page scenes.
      const bounds = interviewBounds();
      const nextY = Math.max(bounds.start, Math.min(bounds.max, touch.at-dy));
      scrollTo(0, nextY);
    }
  }

  function onTouchEnd(event) {
    if (!touch || !enabled || transitioning) { touch = null; return; }
    const point = event.changedTouches[0];
    const dx = point.clientX-touch.x;
    const dy = point.clientY-touch.y;
    const vertical = Math.abs(dy) > 54 && Math.abs(dy) > Math.abs(dx)*1.15;
    const interview = current().mode === 'interviews';
    if (vertical && !interview) dy < 0 ? next() : previous();
    else if (vertical && interview) {
      const bounds = interviewBounds();
      if (dy < 0 && scrollY >= bounds.max-3) next();
      else if (dy > 0 && scrollY <= bounds.start+3) previous();
    }
    touch = null;
  }

  function onWheel(event) {
    if (!enabled || transitioning || document.querySelector('.policy-sheet.is-open')) return;
    if (current().mode === 'interviews') {
      const bounds = interviewBounds();
      if (event.deltaY > 0 && scrollY >= bounds.max-2) { event.preventDefault(); next(); }
      else if (event.deltaY < 0 && scrollY <= bounds.start+2) { event.preventDefault(); previous(); }
      return;
    }
    event.preventDefault();
    wheelTotal += event.deltaY;
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(() => { wheelTotal = 0; }, 180);
    if (Math.abs(wheelTotal) > 36) {
      const direction = wheelTotal > 0 ? 1 : -1;
      wheelTotal = 0;
      direction > 0 ? next() : previous();
    }
  }

  function onKey(event) {
    if (!enabled || transitioning || event.defaultPrevented || document.querySelector('.policy-sheet.is-open')) return;
    if (event.key === 'PageDown' || event.key === 'ArrowDown' || event.key === ' ') {
      if (current().mode !== 'interviews') { event.preventDefault(); next(); }
    } else if (event.key === 'PageUp' || event.key === 'ArrowUp') {
      if (current().mode !== 'interviews') { event.preventDefault(); previous(); }
    }
  }

  function enable() {
    if (enabled || !mobile.matches) return;
    enabled = true;
    root.classList.add('h5-mobile-pager');
    index = Math.max(0, pages.findIndex(item => {
      const element = elementFor(item);
      if (!element) return false;
      const top = pageTop(element);
      return scrollY >= top-2 && scrollY < top+pageHeight(element);
    }));
    jumpTo(current(), 1);
  }

  function disable() {
    if (!enabled) return;
    enabled = false;
    transitioning = false;
    root.classList.remove('h5-mobile-pager', 'h5-interview-flow');
    fade.classList.remove('is-visible');
    maskTop.style.height = maskBottom.style.height = '0px';
    dispatchEvent(new CustomEvent('h5:pagechange', {detail:{mobile:false, slug:''}}));
  }

  addEventListener('touchstart', onTouchStart, {passive:true, capture:true});
  addEventListener('touchmove', onTouchMove, {passive:false, capture:true});
  addEventListener('touchend', onTouchEnd, {passive:true, capture:true});
  addEventListener('touchcancel', () => { touch = null; }, {passive:true, capture:true});
  addEventListener('wheel', onWheel, {passive:false});
  addEventListener('keydown', onKey);
  addEventListener('scroll', () => {
    clampInterviewScroll();
    if (enabled && current().mode !== 'interviews') {
      // 点击按钮取得焦点时，Safari/Chrome 可能自动滚动页面；独立场景始终锁回页首。
      if (Math.abs(scrollY-lockedScrollY) > 1) scrollTo(0, lockedScrollY);
      updateMasks();
    }
  }, {passive:true});
  addEventListener('resize', () => {
    if (!enabled) return;
    lockedScrollY = targetScroll(current(), 1);
    scrollTo(0, lockedScrollY);
    updateMasks();
  }, {passive:true});

  if (mobile.addEventListener) mobile.addEventListener('change', event => event.matches ? enable() : disable());
  else mobile.addListener(event => event.matches ? enable() : disable());
  enable();

  window.__H5_MOBILE_PAGER__ = {pages, get index(){return index;}, next, previous};
})();
