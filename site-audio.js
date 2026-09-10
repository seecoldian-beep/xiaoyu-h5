(() => {
  'use strict';

  const audio = document.getElementById('h5-voice');
  const controls = document.getElementById('h5-audio-controls');
  const toggle = document.getElementById('h5-audio-toggle');
  const icon = document.getElementById('h5-audio-icon');
  const volume = document.getElementById('h5-audio-volume');
  if (!audio || !controls || !toggle || !icon || !volume) return;

  let userControlled = false;
  let autoStartFinished = false;
  audio.volume = Number(volume.value);

  function updateControl() {
    const playing = !audio.paused && !audio.ended;
    toggle.dataset.playing = String(playing);
    toggle.setAttribute('aria-label', playing ? '暂停配音' : audio.ended ? '重新播放配音' : '播放配音');
    icon.textContent = playing ? 'Ⅱ' : '▶';
  }

  function play() {
    if (audio.ended || audio.currentTime >= 48) audio.currentTime = 0;
    return audio.play().then(updateControl).catch(updateControl);
  }

  function stopAutoStart() {
    if (autoStartFinished) return;
    autoStartFinished = true;
    document.removeEventListener('pointerdown', startOnFirstGesture, true);
    document.removeEventListener('touchstart', startOnFirstGesture, true);
    document.removeEventListener('keydown', startOnFirstGesture, true);
  }

  function startOnFirstGesture(event) {
    if (userControlled || event.target.closest?.('#h5-audio-controls')) return;
    stopAutoStart();
    play();
  }

  toggle.addEventListener('click', () => {
    userControlled = true;
    stopAutoStart();
    if (audio.paused || audio.ended) play();
    else {
      audio.pause();
      updateControl();
    }
  });

  volume.addEventListener('input', () => {
    userControlled = true;
    audio.volume = Number(volume.value);
    audio.muted = audio.volume === 0;
  });

  audio.addEventListener('play', updateControl);
  audio.addEventListener('pause', updateControl);
  audio.addEventListener('ended', updateControl);
  audio.addEventListener('timeupdate', () => {
    if (audio.currentTime < 48) return;
    audio.pause();
    audio.currentTime = 48;
    updateControl();
  });

  document.addEventListener('pointerdown', startOnFirstGesture, {capture: true, passive: true});
  document.addEventListener('touchstart', startOnFirstGesture, {capture: true, passive: true});
  document.addEventListener('keydown', startOnFirstGesture, {capture: true});
  updateControl();

  window.H5AudioController = {
    get volume() { return audio.muted ? 0 : audio.volume; }
  };
})();
