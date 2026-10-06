import { createSynthAudio } from './audio-synth.js';
import { reportError } from './diagnostics.js';

// All effects are made on-device. No sample files, downloads or external audio services.
export function createGameAudio(createContext = () => new (window.AudioContext || window.webkitAudioContext)()) {
  let context, active = true, enabled = true;
  const getContext = () => context ??= createContext();
  const synth = createSynthAudio(getContext);
  const canPlay = on => !!on && enabled && active;
  return {
    stop: () => synth.stop(),
    unlock() {
      if (!enabled || !active) return;
      try {
        const ctx = getContext();
        if (ctx.state === 'suspended') Promise.resolve(ctx.resume()).catch(error => reportError('audio.resume', error));
      } catch (error) { reportError('audio.unlock', error); }
    },
    configure(settings) {
      enabled = !!settings.enabled; active = !!settings.active;
      if (!enabled || !active) synth.stop();
    },
    prepareBattle() {},
    ui(id, on) { synth.tap(canPlay(on)); },
    tap(on) { synth.tap(canPlay(on)); },
    recruit(on) { synth.recruit(canPlay(on)); },
    battle(kind, on) {
      const sound = ({strike:'boom',impact:'boom',heal:'deploy',start:'deploy'})[kind] ?? kind;
      synth.battle(sound,canPlay(on));
    },
    promotion(rank, on) {
      if (canPlay(on)) synth.promotion(rank,true);
    },
  };
}
