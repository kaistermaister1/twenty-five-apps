const state = {
  started: false,
  rainAudio: null,
  songAudio: null,
  fadeIntervalId: null,
  rainAnim: null
};

function getSupportedSongSrc() {
  const audio = document.createElement('audio');
  // Prefer m4a (AAC) for iOS Safari, fallback to mp3.
  if (audio.canPlayType('audio/mp4')) return 'assets/sparks.m4a';
  return 'assets/sparks.mp3';
}

function getSupportedRainSrc() {
  const audio = document.createElement('audio');
  if (audio.canPlayType('audio/mp4')) return 'assets/rain.m4a';
  return 'assets/rain.mp3';
}

function createAudio(src, { loop = false, volume = 1.0 } = {}) {
  const el = new Audio(src);
  el.loop = loop;
  el.preload = 'auto';
  el.volume = volume;
  return el;
}

async function startPlayback() {
  if (state.started) return;
  state.started = true;

  const title = document.getElementById('title');
  const hint = document.getElementById('hint');
  // Hide the hint once playback starts
  if (hint) hint.style.display = 'none';

  // Visual handled by GIF background in CSS

  const rainSrc = getSupportedRainSrc();
  const songSrc = getSupportedSongSrc();

  state.rainAudio = createAudio(rainSrc, { loop: true, volume: 0.35 });
  state.songAudio = createAudio(songSrc, { loop: false, volume: 1.0 });

  // Try to resume from user gesture; iOS requires play() on gesture.
  try { await state.rainAudio.play(); } catch (_) {}
  try {
    await state.songAudio.play();
  } catch (err) {
    // If blocked, show a prompt and allow another tap.
    state.started = false;
    if (hint) { hint.style.display = ''; hint.textContent = 'Tap to allow audio'; }
    return;
  }

  state.songAudio.addEventListener('ended', () => {
    fadeOutAndStop(state.rainAudio, 1200).then(closeApp);
  });
}

function fadeOutAndStop(audioEl, durationMs) {
  return new Promise(resolve => {
    if (!audioEl) return resolve();
    const start = performance.now();
    const startVolume = audioEl.volume;
    function step(now) {
      const t = Math.min(1, (now - start) / durationMs);
      audioEl.volume = startVolume * (1 - t);
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        try { audioEl.pause(); } catch (_) {}
        audioEl.currentTime = 0;
        audioEl.volume = startVolume;
        resolve();
      }
    }
    requestAnimationFrame(step);
  });
}

function closeApp() {
  // Attempt to close the window (might be blocked if not user-opened)
  window.close();
  // Fallback: hide UI and stop all audio
  document.body.style.opacity = '0';
  document.body.style.transition = 'opacity 400ms ease-out';
  // Visual handled by CSS
  setTimeout(() => {
    if (state.songAudio) { try { state.songAudio.pause(); } catch (_) {} }
    if (state.rainAudio) { try { state.rainAudio.pause(); } catch (_) {} }
  }, 450);
}

// Start on first user interaction anywhere
window.addEventListener('pointerdown', startPlayback, { once: false });
window.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') startPlayback(); });

// (Canvas rain removed; background is a GIF via CSS)

