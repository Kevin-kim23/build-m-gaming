import { audioUrl, MUSIC_IDS } from './audio-catalog.js';
import { reportError } from './diagnostics.js';

// A single streaming media element avoids decoding all 18 tracks into phone memory.
// A generation token invalidates old play promises when the scene or activity changes.
export function createMusicPlayer({ createMedia = () => new Audio(), now = () => performance.now(), setTimer = setTimeout, clearTimer = clearTimeout, onError = reportError } = {}) {
  const failed = new Set();
  let media, desired = 'home', current = null, enabled = false, active = true, unlocked = false, paused = false;
  let token = 0, fadeTimer = null, duckTimer = null, duckUntil = 0, requested = null;
  const volume = () => (desired.endsWith('-capital') ? 0.30 : desired === 'home' ? 0.24 : 0.27) * (now() < duckUntil ? 0.35 : 1);
  function clearFade() { if (fadeTimer !== null) clearTimer(fadeTimer); fadeTimer = null; }
  function halt() {
    token++; requested = null; clearFade();
    if (duckTimer !== null) clearTimer(duckTimer); duckTimer = null; duckUntil = 0;
    media?.pause();
  }
  const canPlay = () => enabled && active && unlocked && !paused;
  function fadeIn(expected) {
    clearFade();
    const started = now();
    function step() {
      if (expected !== token || !canPlay()) return;
      const part = Math.min(1, (now() - started) / 450);
      media.volume = volume() * part;
      fadeTimer = part < 1 ? setTimer(step, 50) : null;
    }
    step();
  }
  function sync() {
    if (!canPlay()) { halt(); return; }
    if (!MUSIC_IDS.includes(desired) || failed.has(desired)) { halt(); return; }
    if (requested === desired || (current === desired && media && !media.paused)) return;
    const expected = ++token; clearFade();
    try {
      media ??= createMedia();
      if (current !== desired) {
        media.pause(); media.src = audioUrl(desired); media.loop = true; media.preload = 'auto'; current = desired;
      }
      media.volume = 0; requested = desired;
      Promise.resolve(media.play()).then(() => {
        if (expected !== token) return;
        requested = null;
        if (!canPlay()) { media.pause(); return; }
        fadeIn(expected);
      }).catch(error => {
        if (expected !== token) return;
        requested = null;
        // Autoplay restrictions are recoverable on the next real user gesture.
        if (error?.name === 'NotAllowedError') unlocked = false;
        else { failed.add(desired); onError('audio.music', error); }
      });
    } catch (error) { requested = null; failed.add(desired); onError('audio.music', error); }
  }
  return {
    configure(settings) {
      const nextEnabled = !!settings.enabled, nextActive = !!settings.active;
      if (nextEnabled === enabled && nextActive === active) return;
      enabled = nextEnabled; active = nextActive; sync();
    },
    unlock() { unlocked = true; sync(); },
    scene(id) { if (!MUSIC_IDS.includes(id) || id === desired) return; desired = id; sync(); },
    pause(value) { if (paused === value) return; paused = value; sync(); },
    duck(ms = 1800) {
      duckUntil = Math.max(duckUntil, now() + ms);
      if (media && canPlay()) media.volume = volume();
      if (duckTimer !== null) clearTimer(duckTimer);
      duckTimer = setTimer(() => { duckTimer = null; if (media && canPlay()) media.volume = volume(); }, Math.max(0, duckUntil - now()));
    },
    stop: halt,
    get track() { return desired; },
  };
}
