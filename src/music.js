import { reportError } from './diagnostics.js';

export const MUSIC_TRACKS = Object.freeze({
  title: ['./audio/music/title.mp3'],
  home: ['./audio/music/home-1.mp3', './audio/music/home-2.mp3'],
  battle: ['./audio/music/battle.mp3'],
});

// One media element: no overlapping tracks or decoded, full-song buffers.
export function createMusicPlayer({ createAudio = () => {
  const element = new Audio();
  element.hidden = true; element.dataset.backgroundMusic = '';
  document.body.append(element);
  return element;
}, onError = reportError } = {}) {
  let media, scene = null, active = false, volume = 0.45, pending = false, blocked = false;
  let generation = 0, failed = false;
  const positions = new Map();
  const indices = { title: 0, home: 0, battle: 0 };
  function ensure() {
    if (media) return media;
    media = createAudio();
    media.preload = 'metadata';
    media.addEventListener('ended', () => {
      if (!scene || !active) return;
      indices[scene] = (indices[scene] + 1) % MUSIC_TRACKS[scene].length;
      positions.delete(scene);
      load(); play();
    });
    media.addEventListener('error', () => {
      failed = true; pending = false;
      onError('music.media', new Error('Background track could not load'));
    });
    return media;
  }
  function halt() {
    generation++; pending = false;
    media?.pause();
  }
  function load() {
    const node = ensure();
    halt(); failed = false; blocked = false;
    node.src = MUSIC_TRACKS[scene][indices[scene]];
    node.load();
    node.currentTime = positions.get(scene) ?? 0;
  }
  function play() {
    if (!scene || !active || volume === 0 || pending || blocked || failed) return;
    const node = ensure();
    node.volume = volume;
    if (!node.paused) return;
    const ticket = generation;
    pending = true;
    function rejected(error) {
      if (ticket !== generation) return;
      pending = false;
      if (error?.name === 'NotAllowedError') blocked = true;
      else if (error?.name !== 'AbortError') { failed = true; onError('music.play', error); }
    }
    try {
      Promise.resolve(node.play()).then(() => {
        if (ticket === generation) pending = false;
      }, rejected);
    } catch (error) { rejected(error); }
  }
  return {
    configure(settings) {
      if ('scene' in settings && settings.scene !== scene) {
        if (scene && media) positions.set(scene, media.currentTime);
        halt(); scene = MUSIC_TRACKS[settings.scene] ? settings.scene : null;
        if (scene) load();
      }
      if ('volume' in settings) volume = Math.max(0, Math.min(1, Number(settings.volume) || 0));
      if ('active' in settings) active = !!settings.active;
      if (media) media.volume = volume;
      if (!active || !scene || volume === 0) halt(); else play();
    },
    unlock() { blocked = false; play(); },
    get scene() { return scene; },
  };
}
