(function () {
  'use strict';

  const WIDTH = 620;
  const HEIGHT = 330;
  const SCALE = WIDTH / 6.3;

  function project(longitude, latitude) {
    const lambda = longitude * Math.PI / 180;
    const phi = latitude * Math.PI / 180;
    const p2 = phi * phi;
    const p4 = p2 * p2;
    const x = lambda * (.8707 - .131979 * p2 + p4 * (-.013791 + p4 * (.003971 * p2 - .001529 * p4)));
    const y = phi * (1.007226 + p2 * (.015085 + p4 * (-.044475 + .028874 * p2 - .005916 * p4)));
    return [WIDTH / 2 + x * SCALE, HEIGHT / 2 - y * SCALE];
  }

  function createSheet() {
    const backdrop = document.createElement('div');
    backdrop.className = 'sheet-backdrop';
    const sheet = document.createElement('section');
    sheet.className = 'policy-sheet';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.setAttribute('aria-labelledby', 'policy-sheet-title');

    const close = document.createElement('button');
    close.className = 'sheet-close';
    close.type = 'button';
    close.setAttribute('aria-label', '关闭政策详情');
    close.textContent = '×';
    const title = document.createElement('h2');
    title.id = 'policy-sheet-title';
    const status = document.createElement('p');
    status.className = 'sheet-status';
    const copy = document.createElement('p');
    copy.className = 'sheet-copy';
    sheet.append(close, title, status, copy);
    document.body.append(backdrop, sheet);

    let returnFocus = null;
    let savedScrollY = 0;
    function hide() {
      sheet.classList.remove('is-open');
      backdrop.classList.remove('is-open');
      document.body.style.overflow = '';
      window.scrollTo(0, savedScrollY);
      if (returnFocus) returnFocus.focus({preventScroll: true});
    }
    function show(policy, trigger) {
      returnFocus = trigger;
      savedScrollY = window.scrollY;
      title.textContent = policy.name;
      status.textContent = policy.levelText;
      status.style.color = policy.color;
      copy.textContent = policy.desc;
      backdrop.classList.add('is-open');
      sheet.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      close.focus({preventScroll: true});
    }
    close.addEventListener('click', hide);
    backdrop.addEventListener('click', hide);
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && sheet.classList.contains('is-open')) hide();
    });
    return {show, hide};
  }

  function mount(root, markup, policies) {
    root.className = 'policy-map';
    const art = document.createElement('div');
    art.className = 'map-art';
    art.insertAdjacentHTML('afterbegin', markup);
    const svg = art.querySelector('svg');
    const dots = document.createElement('div');
    dots.className = 'map-points';
    const sheet = createSheet();

    policies.forEach((policy, index) => {
      const [x, y] = project(policy.lng, policy.lat);
      if (svg) {
        const marker = document.createElementNS(svg.namespaceURI, 'circle');
        marker.setAttribute('cx', x.toFixed(2));
        marker.setAttribute('cy', y.toFixed(2));
        marker.setAttribute('r', '4');
        marker.setAttribute('fill', policy.color);
        marker.setAttribute('stroke', '#f7f2e3');
        marker.setAttribute('stroke-width', '1.5');
        marker.setAttribute('class', 'map-dot');
        marker.style.opacity = '0';
        svg.append(marker);
      }
      const button = document.createElement('button');
      button.className = 'policy-point';
      button.type = 'button';
      button.style.left = `${x}px`;
      button.style.top = `${y}px`;
      button.style.setProperty('--point-color', policy.color);
      button.style.opacity = '0';
      button.style.transform = 'scale(.72)';
      button.dataset.index = String(index);
      button.title = policy.name;
      button.setAttribute('aria-label', `查看${policy.name}的政策：${policy.levelText}`);
      button.addEventListener('click', () => sheet.show(policy, button));
      dots.append(button);
    });
    art.append(dots);

    const legend = document.createElement('div');
    legend.className = 'map-legend';
    const unique = [];
    policies.forEach(policy => {
      if (!unique.some(item => item.color === policy.color)) unique.push(policy);
    });
    unique.forEach(policy => {
      const item = document.createElement('span');
      item.style.setProperty('--legend-color', policy.color);
      item.textContent = policy.levelText;
      legend.append(item);
    });
    const instruction = document.createElement('p');
    instruction.className = 'map-instruction';
    instruction.textContent = '点击地图上的国家查看政策详情';
    const fallback = document.createElement('div');
    fallback.className = 'policy-fallback';
    fallback.textContent = policies.map(policy => `${policy.name}：${policy.levelText}。${policy.desc}`).join(' ');
    root.append(art, legend, instruction, fallback);

    function render(progress) {
      const p = Math.max(0, Math.min(1, progress));
      root.classList.toggle('is-visible', p > .03);
      const buttons = root.querySelectorAll('.policy-point');
      const markers = root.querySelectorAll('.map-dot');
      buttons.forEach((button, index) => {
        const dotP = Math.max(0, Math.min(1, (p - .3 - index * .035) / .28));
        button.style.opacity = String(dotP);
        button.style.transform = `scale(${.72 + .28 * dotP})`;
        if (markers[index]) markers[index].style.opacity = String(dotP);
      });
    }
    render(0);
    return {render};
  }

  window.H5PolicyMap = {mount};
}());
