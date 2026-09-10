(() => {
  'use strict';

  const WIDTH = 620;
  const HEIGHT = 330;
  const SCALE = WIDTH / 6.3;
  const policies = window.H5_POLICY_DATA || [];
  const map = document.getElementById('standalone-map');
  const legend = document.getElementById('map-legend');
  const countryList = document.getElementById('country-list');
  const detail = document.getElementById('policy-detail');
  const title = document.getElementById('detail-title');
  const status = document.getElementById('detail-status');
  const copy = document.getElementById('detail-copy');
  const back = document.getElementById('map-back');
  if (!map || !legend || !countryList || !detail || !title || !status || !copy) return;

  function project(longitude, latitude) {
    const lambda = longitude * Math.PI / 180;
    const phi = latitude * Math.PI / 180;
    const p2 = phi * phi;
    const p4 = p2 * p2;
    const x = lambda * (.8707 - .131979 * p2 + p4 * (-.013791 + p4 * (.003971 * p2 - .001529 * p4)));
    const y = phi * (1.007226 + p2 * (.015085 + p4 * (-.044475 + .028874 * p2 - .005916 * p4)));
    return [WIDTH / 2 + x * SCALE, HEIGHT / 2 - y * SCALE];
  }

  function paintCountry(svg, policy, x, y) {
    const paths = Array.from(svg.querySelectorAll('path'));
    let country = Number.isInteger(policy.pathIndex) ? paths[policy.pathIndex] : null;
    const point = svg.createSVGPoint();
    point.x = x;
    point.y = y;
    if (!country) {
      country = paths.filter(path => {
        try { return typeof path.isPointInFill === 'function' && path.isPointInFill(point); }
        catch (error) { return false; }
      }).sort((a, b) => {
        const aBox = a.getBBox();
        const bBox = b.getBBox();
        return aBox.width * aBox.height - bBox.width * bBox.height;
      })[0];
    }
    if (!country) return null;
    country.classList.add('policy-country');
    country.style.setProperty('--policy-country-color', policy.color);
    country.dataset.policyCountry = policy.name;
    return country;
  }

  const unique = [];
  policies.forEach(policy => {
    if (!unique.some(item => item.color === policy.color)) unique.push(policy);
  });
  unique.forEach(policy => {
    const item = document.createElement('span');
    item.className = 'legend-item';
    item.style.setProperty('--legend-color', policy.color);
    item.textContent = policy.levelText;
    legend.append(item);
  });

  const controls = new Map();
  policies.forEach(policy => {
    const link = document.createElement('a');
    link.className = 'country-link';
    link.href = `?country=${encodeURIComponent(policy.name)}`;
    link.style.setProperty('--country-color', policy.color);
    link.textContent = policy.name;
    link.addEventListener('click', event => {
      event.preventDefault();
      selectPolicy(policy, true);
    });
    countryList.append(link);
    controls.set(policy.name, {link});
  });

  function selectPolicy(policy, moveToDetail) {
    policies.forEach(item => {
      const control = controls.get(item.name);
      const selected = item.name === policy.name;
      control?.link.classList.toggle('is-selected', selected);
      control?.point?.classList.toggle('is-selected', selected);
      control?.country?.classList.toggle('is-selected', selected);
    });
    detail.style.setProperty('--detail-color', policy.color);
    title.textContent = policy.name;
    status.textContent = policy.levelText;
    copy.textContent = policy.desc;
    detail.classList.remove('is-updated');
    void detail.offsetWidth;
    detail.classList.add('is-updated');
    history.replaceState(null, '', `?country=${encodeURIComponent(policy.name)}`);
    if (moveToDetail) detail.scrollIntoView({behavior: 'smooth', block: 'start'});
  }

  fetch('./assets/extension/map/world-map.svg')
    .then(response => {
      if (!response.ok) throw new Error('地图素材加载失败');
      return response.text();
    })
    .then(markup => {
      map.innerHTML = markup;
      const svg = map.querySelector('svg');
      if (!svg) throw new Error('地图素材无效');
      svg.setAttribute('aria-hidden', 'true');
      policies.forEach(policy => {
        const [x, y] = project(policy.lng, policy.lat);
        const country = paintCountry(svg, policy, x, y);
        const point = document.createElement('button');
        point.className = 'standalone-point';
        point.type = 'button';
        point.style.left = `${x / WIDTH * 100}%`;
        point.style.top = `${y / HEIGHT * 100}%`;
        point.style.setProperty('--point-color', policy.color);
        point.setAttribute('aria-label', `查看${policy.name}政策`);
        point.addEventListener('click', () => selectPolicy(policy, true));
        map.append(point);
        Object.assign(controls.get(policy.name), {point, country});
      });
      const requested = new URLSearchParams(location.search).get('country');
      const initial = policies.find(policy => policy.name === requested);
      if (initial) selectPolicy(initial, false);
    })
    .catch(() => {
      map.innerHTML = '<p class="map-loading">地图暂时无法加载，请使用下方国家列表查看详情。</p>';
    });

  back?.addEventListener('click', () => {
    if (document.referrer && new URL(document.referrer).origin === location.origin) history.back();
    else location.href = './index.html';
  });
})();
