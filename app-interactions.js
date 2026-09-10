(() => {
  'use strict';
  const manifest = window.PSD_MANIFEST;
  const artwork = window.PSD_INTERACTIONS;
  const motion = window.H5Motion;
  const page = document.querySelector('#page');
  const canvas = document.querySelector('#design-canvas');
  const params = new URLSearchParams(location.search);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const staticMode = params.get('mode') === 'static';
  const qa = params.get('qa') === '1';
  const reducedMotion = () => reduced.matches || (qa && params.get('motion') === 'reduce');
  const qaScene = params.get('scene');
  const qaProgress = qa && params.has('p') ? motion.clamp(Number(params.get('p'))) : null;
  const qaPhoneTime = qa && params.has('phone') ? Math.max(0, Math.min(4000, Number(params.get('phone')))) : null;
  const qaOpeningTime = qa && params.has('opening') ? Math.max(0, Math.min(3800, Number(params.get('opening')))) : null;
  const introductionMobileDuration = 5200;
  const narrativeMobileDuration = 3600;
  const replyDuration = 1100;
  const scenes = new Map();
  let pageScale = 1;
  let frame = 0;
  let mobilePage = null;
  const opening = {start: null, elapsed: 0};
  const configs = {
    introduction: { top: 121, type: 'introduction' },
    // 卧室场景：底图 5；环境与人物、阴影分开推进。
    bedroom: { top: 400, delta: 526, environment: 8, characters: [12,10,15], dialogues: [[14,34],[13,35]] },
    // 教室场景：保留原人物组合，不拆开老师和小羽。
    classroom: { top: 200, delta: 508, environment: 17, characters: [27], dialogues: [[18,36],[19,37]] },
    // 放学路上场景：同学和小羽沿用同一张原素材。
    'school-road': { top: 265, delta: 596, environment: 22, characters: [28], dialogues: [[23,61],[26,62]] }
  };

  function image(src, className, width, height, deferred = true) {
    const node = document.createElement('img');
    Object.assign(node, {className, width, height, alt: '', draggable: false, decoding: 'async'});
    if (deferred) node.dataset.src = src;
    else node.src = src;
    return node;
  }
  function position(node, row) {
    for (const [key,value] of Object.entries({x:row.x, y:row.y, width:row.width, height:row.height, z:row.zIndex})) {
      node.style.setProperty(`--psd-${key}`, value);
    }
  }
  function layer(scene, id) {
    const row = artwork.layers[id];
    const node = image(row.file, 'psd-layer', row.width, row.height);
    position(node, row);
    node.dataset.psdLayerId = id;
    node.dataset.psdLayerName = row.name;
    node.style.opacity = row.originalOpacity;
    scene.stage.append(node);
    scene.nodes.set(id, node);
    scene.images.push(node);
    return node;
  }
  function pairedPivot(scene, ids) {
    const bubble = artwork.layers[ids[0]];
    const x = bubble.x + bubble.width / 2;
    const y = bubble.y + bubble.height / 2;
    for (const id of ids) {
      const row = artwork.layers[id];
      scene.nodes.get(id).style.transformOrigin = `${x-row.x}px ${y-row.y}px`;
    }
  }
  function setLayer(scene, id, factor, transform = 'none') {
    const node = scene.nodes.get(id);
    if (!node) return;
    node.style.opacity = artwork.layers[id].originalOpacity * factor;
    node.style.transform = transform;
  }
  function showPair(scene, ids, factor) {
    // 对话内容：文字与气泡共用缩放中心，但仍保留各自原层级。
    const transform = factor === 1 ? 'none' : `scale(${motion.bubbleScale(factor)})`;
    ids.forEach(id => setLayer(scene, id, factor, transform));
  }

  function clickWithoutDrag(button, action) {
    let start = null;
    let dragged = false;
    button.addEventListener('pointerdown', event => {start=[event.clientX,event.clientY]; dragged=false;}, {passive:true});
    button.addEventListener('pointermove', event => {
      if (start && Math.hypot(event.clientX-start[0],event.clientY-start[1]) > 10) dragged=true;
    }, {passive:true});
    button.addEventListener('pointercancel', () => {dragged=true; start=null;}, {passive:true});
    button.addEventListener('click', event => {if (event.detail === 0 || !dragged) action(); start=null;});
  }

  function replyButton(scene, config) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'reply-hint';
    button.disabled = true;
    button.setAttribute('aria-label', '点击看看小羽回复了什么');
    button.setAttribute('aria-hidden', 'true');
    button.innerHTML = '<span>点击看看小羽</span><span>回复了什么</span>';
    // 使用尚未显示的原回复气泡坐标；点击后提示让位给原图层。
    position(button, artwork.layers[config.dialogues[1][0]]);
    scene.section.append(button);
    scene.reply = {clicked: false, start: null, elapsed: 0, button};
    clickWithoutDrag(button, () => {
      if (!scene.ready || scene.failed || scene.reply.clicked || scene.progress < .75) return;
      scene.reply.clicked = true;
      scene.reply.start = performance.now();
      scene.reply.elapsed = reducedMotion() ? replyDuration : 0;
      button.disabled = true;
      button.setAttribute('aria-hidden', 'true');
      schedule();
    });
  }

  for (const definition of manifest.scenes) {
    const section = document.createElement('section');
    section.id = definition.slug;
    section.className = 'scene';
    section.setAttribute('aria-label', definition.name);
    section.dataset.psdGroupId = definition.sourceGroupId;
    section.style.setProperty('--scene-y', definition.y);
    section.style.setProperty('--scene-height', definition.height);
    section.style.zIndex = definition.sourceStackIndex;
    const final = image(definition.file, 'scene-final', definition.width, definition.height, false);
    final.loading = definition.slug === 'opening' ? 'eager' : 'lazy';
    section.append(final);
    canvas.append(section);
    const scene = {...definition, section, final, nodes: new Map(), images: [], progress: 0, ready: false};
    scenes.set(definition.slug, scene);
    if (staticMode) continue;
    const stage = document.createElement('div');
    stage.className = 'layer-stage';
    stage.setAttribute('aria-hidden', 'true');
    section.append(stage);
    scene.stage = stage;
    if (definition.slug === 'opening') {
      const base = image('assets/interaction/opening-clean-backdrop.png', 'scene-backdrop', 1080, 1986);
      stage.append(base);
      scene.images.push(base);
      for (const patch of artwork.openingPatches) {
        const node = image(`assets/interaction/title-${patch.id}-transparent.png`, 'psd-layer', patch.width, patch.height);
        position(node, patch);
        node.dataset.psdLayerId = patch.id;
        stage.append(node);
        scene.nodes.set(patch.id, node);
        scene.images.push(node);
      }
    } else {
      for (const id of artwork.sceneLayers[definition.slug]) {
        if (!artwork.occludedIds.includes(id)) layer(scene, id);
      }
      const config = configs[definition.slug];
      if (config?.dialogues) {
        config.dialogues.forEach(ids => pairedPivot(scene, ids));
        replyButton(scene, config);
      }
    }
  }

  function prepare(scene) {
    if (scene.preparing) return scene.preparing;
    scene.preparing = Promise.all(scene.images.map(async node => {
      if (!node.src) node.src = node.dataset.src;
      if (node.decode) {
        try {
          await node.decode();
        } catch (error) {
          // iOS 内嵌浏览器偶尔会拒绝离屏图片的 decode()，但图片本身仍可正常加载。
          // 只有图片最终确实没有尺寸时才让场景退回静态图。
          if (!node.complete) await new Promise((resolve, reject) => {
            node.addEventListener('load', resolve, {once:true});
            node.addEventListener('error', reject, {once:true});
          });
        }
      } else if (!node.complete) await new Promise((resolve, reject) => {
        node.addEventListener('load', resolve, {once:true});
        node.addEventListener('error', reject, {once:true});
      });
      if (!node.naturalWidth) throw new Error(`素材读取失败：${node.dataset.src}`);
    })).then(() => {
      scene.ready = true;
      scene.section.dataset.assets = 'ready';
      schedule();
      return true;
    }).catch(error => {
      scene.failed = true;
      scene.section.dataset.assets = 'error';
      scene.section.dataset.render = 'final';
      console.error(error);
      return false;
    });
    return scene.preparing;
  }

  // 开头五个分层场景在进入故事前一次性准备完成。这样即使用户连续快速翻页，
  // 卧室、教室和放学路上也不会先露出包含全部气泡的静态兜底图。
  const openingInteractionScenes = ['opening', 'introduction', 'bedroom', 'classroom', 'school-road'];
  window.__H5_OPENING_INTERACTIONS_READY__ = Promise.all(
    openingInteractionScenes.map(slug => prepare(scenes.get(slug)))
  ).then(results => results.every(Boolean));

  function renderNarrative(scene, p, now) {
    scene.section.dataset.progress = p.toFixed(6);
    const config = configs[scene.slug];
    let complete = false;
    if (scene.slug === 'opening') {
      // 标题区域：加载完成后只播放一次，不随滚动加速或倒放。
      if (scene.ready && opening.start === null) opening.start = now;
      if (reducedMotion() || scrollY >= scene.height * pageScale) opening.elapsed = 3800;
      else if (qaOpeningTime !== null) opening.elapsed = qaOpeningTime;
      else if (opening.start !== null) opening.elapsed = Math.max(opening.elapsed, Math.min(3800, now-opening.start));
      motion.openingFrame(opening.elapsed).forEach(({id, opacity, y}) => {
        scene.nodes.get(id).style.opacity = opacity;
        scene.nodes.get(id).style.transform = y === 0 ? 'none' : `translateY(${y}px)`;
      });
      complete = opening.elapsed === 3800;
      scene.section.dataset.timeline = opening.elapsed.toFixed(1);
      scene.section.dataset.state = complete ? 'complete' : 'titles-in';
      if (scene.ready && !complete && qaOpeningTime === null) schedule();
    } else if (config.type === 'introduction') {
      // 小羽人物区域：留出阅读停顿，五段文字依次出现后人物再缓慢显现。
      [[86,.02,.14],[87,.12,.25],[88,.24,.4],[89,.39,.58],[90,.57,.75],[85,.72,1]].forEach(([id,a,b]) => {
        setLayer(scene,id,motion.phase(p,a,b));
      });
      scene.section.dataset.state = p === 1 ? 'complete' : 'scrubbing';
      complete = p === 1;
    } else {
      const reply = scene.reply;
      if (reply.clicked) {
        reply.elapsed = reducedMotion() ? replyDuration : Math.max(reply.elapsed, Math.min(replyDuration, now-reply.start));
        if (reply.elapsed < replyDuration) schedule();
      }
      const values = motion.narrativeFrame(p, reply.clicked ? reply.elapsed : null);
      setLayer(scene, config.environment, values.environmentOpacity,
        values.environmentY === 0 ? 'none' : `translateY(${values.environmentY}px)`);
      config.characters.forEach(id => setLayer(scene,id,values.characters));
      showPair(scene,config.dialogues[0],values.dialogueOne);
      showPair(scene,config.dialogues[1],values.dialogueTwo);
      const available = scene.ready && !scene.failed && values.replyAvailable && !reply.clicked;
      reply.button.disabled = !available;
      reply.button.setAttribute('aria-hidden', String(!available));
      reply.button.dataset.available = String(available);
      scene.section.dataset.reply = reply.clicked ? values.dialogueTwo === 1 ? 'complete' : 'revealing' : 'unopened';
      complete = values.dialogueTwo === 1;
      scene.section.dataset.state = complete ? 'complete' : reply.clicked ? 'reply-in' : available ? 'awaiting-reply' : p >= .58 ? 'dialogue-in' : p >= .34 ? 'characters-in' : p > 0 ? 'environment-in' : 'pending';
    }
    // 完整静态图保留到动态素材全部解码完成；完成后继续显示同一套分层素材，
    // 避免最后一帧换回压缩后的整图而产生轻微闪动。
    scene.section.dataset.render = scene.ready && !scene.failed ? 'layers' : 'final';
  }

  /* 手机专用展示组：内部坐标和层级不变，只整体平移／等比缩放。 */
  const transition = scenes.get('transition');
  const online = scenes.get('online-world');
  const phone = {state:'idle', clicked:false, nativeRead:false, elapsed:0, start:0, raf:0, clickScroll:0, lift:0, initialScale:1};
  const messagePairs = [[95,99],[96,100],[97,101],[98,102],[103,104]];
  let hotzone;
  function phoneGeometry() {
    const height = innerHeight;
    const mobilePager = document.documentElement.classList.contains('h5-mobile-pager');
    const viewportInset = mobilePager ? 0 : Math.max(20,height * .04);
    const desiredTop = Math.max(transition.y, (scrollY + viewportInset) / pageScale);
    phone.lift = Math.max(0, online.y - desiredTop);
    const viewportCoverScale = height / (online.height * pageScale);
    phone.initialScale = mobilePager
      ? Math.max(1, viewportCoverScale)
      : Math.min(1, Math.max(.78, (height - 32) / (online.height * pageScale)));
    phone.clickScroll = scrollY;
    phone.availableTravel = Math.max(0, (page.getBoundingClientRect().height-height-scrollY)/pageScale);
  }
  function renderPhone(milliseconds) {
    if (staticMode || !online.ready || !transition.ready) return;
    const active = phone.clicked;
    transition.section.dataset.state = phone.state;
    online.section.dataset.state = active ? phone.state : phone.nativeRead ? 'complete' : 'pending';
    if (!active) {
      transition.section.dataset.render = 'final';
      online.section.dataset.render = phone.nativeRead ? 'final' : 'layers';
      online.stage.style.transform = 'none';
      [63,93].forEach(id => setLayer(online,id,phone.nativeRead ? 1 : 0));
      messagePairs.forEach(pair => showPair(online,pair,phone.nativeRead ? 1 : 0));
      return;
    }
    transition.section.dataset.render = 'layers';
    online.section.dataset.render = 'layers';
    const values = motion.phoneFrame(milliseconds);
    let travel = Math.max(0,(scrollY-phone.clickScroll)/pageScale);
    if (scrollY + innerHeight >= document.scrollingElement.scrollHeight - 1) travel = phone.availableTravel;
    const handoff = motion.phoneHandoff(travel,phone.lift,phone.initialScale,phone.availableTravel);
    online.stage.style.transformOrigin = '540px 0px';
    online.stage.style.transform = `translateY(${handoff.offsetY}px) scale(${handoff.scale})`;
    [30,91].forEach(id => setLayer(transition,id,values.shell));
    setLayer(online,33,values.destination);
    setLayer(online,64,values.destination);
    [63,93].forEach(id => setLayer(online,id,values.character));
    messagePairs.forEach((pair,index) => showPair(online,pair,values.messages[index]));
    const source = artwork.layers[65];
    const destination = artwork.layers[64];
    const targetScale = destination.width / source.width * handoff.scale;
    const targetCenter = 540 + (destination.x + destination.width/2 - 540)*handoff.scale;
    const sourceCenter = source.x + source.width/2;
    const pivot = (targetCenter - targetScale * sourceCenter) / (1-targetScale);
    const targetTop = online.y + handoff.offsetY + (destination.y-online.y)*handoff.scale;
    transition.nodes.get(65).style.transformOrigin = `${pivot-source.x}px 0px`;
    setLayer(transition,65,values.source,
      `translateY(${(targetTop-source.y)*values.zoom}px) scale(${1+(targetScale-1)*values.zoom})`);
    online.section.dataset.timeline = milliseconds.toFixed(1);
    if (hotzone) hotzone.disabled = true;
  }
  function finishPhone() {
    cancelAnimationFrame(phone.raf);
    phone.raf = 0;
    phone.elapsed = 4000;
    phone.state = 'expanded';
    renderPhone(4000);
  }
  async function expandPhone(manualTime = null) {
    if (phone.state !== 'idle' || staticMode) return;
    phone.state = 'preparing';
    const requestedAt = scrollY;
    hotzone?.setAttribute('aria-busy','true');
    const ready = await Promise.all([prepare(transition), prepare(online)]);
    hotzone?.removeAttribute('aria-busy');
    if (!ready.every(Boolean)) {
      phone.state = 'idle';
      online.section.dataset.render = 'final';
      return;
    }
    phoneGeometry();
    phone.clicked = true;
    if (manualTime !== null) {
      phone.elapsed = manualTime;
      phone.state = manualTime >= 4000 ? 'expanded' : 'expanding';
      renderPhone(manualTime);
      return;
    }
    if (reducedMotion() || Math.abs(scrollY-requestedAt) > 96) return finishPhone();
    phone.start = performance.now();
    function tick(now) {
      phone.elapsed = Math.min(4000, now-phone.start);
      phone.state = phone.elapsed < 1000 ? 'expanding' : phone.elapsed < 1650 ? 'character-in' : 'messages-in';
      renderPhone(phone.elapsed);
      if (phone.elapsed >= 4000) finishPhone();
      else phone.raf = requestAnimationFrame(tick);
    }
    phone.raf = requestAnimationFrame(tick);
  }
  if (!staticMode) {
    messagePairs.forEach(pair => pairedPivot(online,pair));
    hotzone = document.createElement('button');
    hotzone.type = 'button';
    hotzone.className = 'phone-hotzone';
    hotzone.setAttribute('aria-label','点击查看小羽的手机');
    transition.section.append(hotzone);
    clickWithoutDrag(hotzone, () => expandPhone());
  }

  /* 滚动场景控制代码：滚动推进环境/第一句，标题和点击回复独立计时。 */
  function render(now) {
    frame = 0;
    if (staticMode) return;
    for (const scene of scenes.values()) {
      if (scene.slug === 'transition' || scene.slug === 'online-world') continue;
      const config = configs[scene.slug];
      const pagedActive = mobilePage?.enabled && mobilePage.slug === scene.slug;
      let p;
      if (mobilePage?.enabled) {
        const mobileDuration = scene.slug === 'introduction'
          ? introductionMobileDuration
          : config.dialogues ? narrativeMobileDuration : 1800;
        p = pagedActive && scene.slug !== 'opening' && mobilePage.startedAt !== null
          ? motion.clamp((now-mobilePage.startedAt)/mobileDuration)
          : scene.progress;
      } else {
        p = scene.slug === 'opening' ? motion.clamp(scrollY/(innerHeight*.22)) : motion.scrollProgress({
          scrollY, sceneY:scene.y, interactionTop:config.top, scale:pageScale, viewportHeight:innerHeight,
          characterDelta:config.delta || 0
        });
      }
      if (reducedMotion()) p=1;
      else if (qaProgress !== null && qaScene === scene.slug) p=qaProgress;
      scene.progress = motion.advance(scene.progress,p);
      renderNarrative(scene,scene.progress,now);
      if (pagedActive && scene.slug !== 'opening' && scene.progress < 1) schedule();
    }
    if (!phone.clicked && scrollY > online.y*pageScale-innerHeight*.35) phone.nativeRead=true;
    if (phone.clicked && phone.raf && Math.abs(scrollY-phone.clickScroll)>96) finishPhone();
    renderPhone(phone.elapsed);
  }
  function schedule() { if (!frame) frame=requestAnimationFrame(render); }
  function resize() {
    const previousScale = pageScale;
    pageScale = Math.min(page.clientWidth/1080,1);
    canvas.style.setProperty('--page-scale',pageScale);
    page.style.height = `${13549*pageScale}px`;
    // 地址栏改变可视高度时，不重置展示位置，也不中断点击时间线。
    if (phone.clicked && Math.abs(pageScale-previousScale) > 0.000001) { phoneGeometry(); finishPhone(); }
    schedule();
  }
  resize();
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(resize).observe(page);
  addEventListener('resize',resize,{passive:true});
  addEventListener('scroll',schedule,{passive:true});
  addEventListener('h5:pagechange',event => {
    const detail = event.detail || {};
    mobilePage = {
      enabled: Boolean(detail.mobile),
      slug: detail.slug || '',
      // 当前场景的分层素材就绪后才开始计时，避免加载时间把动画在后台耗尽。
      startedAt: null
    };
    const active = scenes.get(mobilePage.slug);
    if (active && !staticMode) {
      const activeSlug = active.slug;
      prepare(active).then(ready => {
        if (!ready || !mobilePage?.enabled || mobilePage.slug !== activeSlug) return;
        mobilePage.startedAt = performance.now();
        schedule();
      });
      const activeIndex = manifest.scenes.findIndex(scene => scene.slug === active.slug);
      for (const offset of [-1, 1]) {
        const neighbor = manifest.scenes[activeIndex + offset];
        if (neighbor && scenes.has(neighbor.slug)) prepare(scenes.get(neighbor.slug));
      }
    }
    schedule();
  });
  function motionPreferenceChanged() {
    if (reducedMotion() && phone.clicked) finishPhone();
    schedule();
  }
  if (reduced.addEventListener) reduced.addEventListener('change',motionPreferenceChanged);
  else reduced.addListener(motionPreferenceChanged);
  document.addEventListener('visibilitychange',() => {
    if (!document.hidden) return schedule();
    if (phone.clicked && phone.raf) finishPhone();
    if (opening.start !== null) opening.elapsed = 3800;
    scenes.forEach(scene => {if (scene.reply?.clicked) scene.reply.elapsed = replyDuration;});
  });
  if (!staticMode) {
    if ('IntersectionObserver' in window) {
      const loader = new IntersectionObserver(entries => {
        for (const entry of entries) if (entry.isIntersecting) {
          prepare(scenes.get(entry.target.id));
          loader.unobserve(entry.target);
        }
      }, {rootMargin:'120% 0px 120% 0px'});
      scenes.forEach(scene => loader.observe(scene.section));
    } else scenes.forEach(scene => prepare(scene));
  }
  if (qaScene && scenes.has(qaScene)) {
    const selected = scenes.get(qaScene);
    requestAnimationFrame(() => {
      scrollTo(0,selected.y*pageScale);
      if (!staticMode) prepare(selected);
      if (qaPhoneTime !== null) expandPhone(qaPhoneTime);
      schedule();
    });
  }
})();
