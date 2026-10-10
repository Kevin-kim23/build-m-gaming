import { createMusicPlayer } from './music.js';
import { createSynthAudio } from './audio-synth.js';
import { reportError } from './diagnostics.js';

// All effects are made on-device. No sample files, downloads or external audio services.
export function createGameAudio(createContext = () => new (window.AudioContext || window.webkitAudioContext)(),
  {music = createMusicPlayer()} = {}) {
  let context, active = true, enabled = true, adHolds = 0;
  const getContext = () => context ??= createContext();
  const synth = createSynthAudio(getContext);
  const canPlay = on => !!on && enabled && active && adHolds === 0;
  return {
    music,
    setMusicScene: scene => music.configure({scene}),
    stop: () => synth.stop(),
    async suspendForAd() {
      adHolds++;
      const releaseMusic = music.suspend();
      synth.stop();
      // Release the game's audio focus before the SDK starts its video.
      try { if (context && context.state !== 'closed') await context.suspend(); }
      catch (error) { reportError('audio.ad.suspend', error); }
      let released = false;
      return () => {
        if (released) return;
        released = true; adHolds--;
        releaseMusic();
      };
    },
    unlock() {
      if (!canPlay(true)) return;
      try {
        const ctx = getContext();
        if (ctx.state === 'suspended') Promise.resolve(ctx.resume()).catch(error => reportError('audio.resume', error));
      } catch (error) { reportError('audio.unlock', error); }
    },
    configure(settings) {
      enabled = !!settings.enabled; active = !!settings.active;
      synth.setVolume(settings.volume ?? 1);
      if (!canPlay(true)) synth.stop();
    },
    prepareBattle() {},
    ui(id, on) { synth.tap(canPlay(on)); },
    tap(on) { synth.tap(canPlay(on)); },
    recruit(on) { synth.recruit(canPlay(on)); },
    battle(kind, on, gearId) {
      const sound = ({strike:'boom',impact:'boom',heal:'deploy',start:'deploy'})[kind] ?? kind;
      synth.battle(sound,canPlay(on),kind==='shot'||kind==='strike'?gearId:null);
    },
    promotion(rank, on) {
      if (canPlay(on)) synth.promotion(rank,true);
    },
  };
}
