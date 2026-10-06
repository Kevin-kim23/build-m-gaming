import { createSynthAudio } from './audio-synth.js';
import { createSoundPlayer } from './sound-player.js';
import { createMusicPlayer } from './music-player.js';
import { battleSound, musicForScene, GEAR_SOUND_IDS } from './audio-catalog.js';
import { reportError } from './diagnostics.js';

// The existing facade stays stable; bundled samples and streaming BGM share one sound switch.
export function createGameAudio(createContext = () => new (window.AudioContext || window.webkitAudioContext)(), options = {}) {
  const generated = options.generated ?? typeof window !== 'undefined';
  let context, active = true, enabled = false, warmed = false;
  const getContext = () => context ??= createContext();
  const synth = createSynthAudio(getContext);
  const effects = generated ? createSoundPlayer({getContext,...options.effects}) : null;
  const music = generated ? createMusicPlayer(options.music) : null;
  function unlock() {
    if (!active || !enabled) return;
    try {
      const ctx = getContext();
      if (ctx.state === 'suspended') Promise.resolve(ctx.resume()).catch(error => reportError('audio.resume', error));
    }
    catch (error) { reportError('audio.unlock', error); }
    music?.unlock();
    if (effects && !warmed) {
      warmed = true;
      for (const id of ['tap','click','recruit','purchase','build','equip','upgrade-success','upgrade-fail','promotion','medal','sword','revolver','error','unlock']) void effects.preload(id);
    }
  }
  function effect(id, on, fallback = () => synth.tap(true), params = {}) {
    if (!on || !active) return;
    if (!effects) { fallback(); return; }
    const status = effects.play(id, params);
    if (status === 'played') synth.stop();
    else if ((status === 'loading' || status === 'failed') && effects.activeVoices === 0) fallback();
  }
  function stop() { synth.stop(); effects?.stop(); music?.stop(); }
  return {
    stop, unlock,
    configure(settings) {
      const changed = enabled !== !!settings.enabled || active !== !!settings.active;
      enabled = !!settings.enabled; active = !!settings.active;
      if (!changed) return;
      if (!enabled || !active) { synth.stop(); effects?.suspend(true); }
      else effects?.suspend(false);
      music?.configure({enabled,active});
    },
    scene(scene, stageId = 0) { music?.scene(musicForScene(scene,stageId)); },
    pauseMusic(value) { if (value) { synth.stop(); effects?.stop(); } music?.pause(value); },
    prepareBattle() {
      if (!enabled || !active || !effects) return;
      for (const id of [...GEAR_SOUND_IDS.flatMap(id => [`${id}-action`,`${id}-deploy`]),'turret-shot','impact','explosion','base-hit','battle-start','victory','defeat','draw']) void effects.preload(id);
    },
    ui(id, on) { effect(id,on); },
    tap(on) { effect('tap',on,()=>synth.tap(true)); },
    recruit(on) { effect('recruit',on,()=>synth.recruit(true)); },
    battle(kind,on,gearId=null,side='player') {
      const id = battleSound(kind,gearId); if (!id) return;
      if (on && ['win','lose','draw'].includes(kind)) music?.duck(2600);
      effect(id,on,()=>synth.battle(kind === 'strike' ? 'boom' : kind === 'heal' ? 'deploy' : kind,true),{gain:side === 'enemy' ? 0.48 : 1,priority:['win','lose','draw'].includes(kind)});
    },
    promotion(rank,on) {
      if (!on || !active) return;
      synth.stop(); effects?.stop(); music?.duck(3200);
      effect('promotion',true,()=>synth.promotion(rank,true),{gain:Math.min(1.2,0.65+rank*0.025),priority:true});
    },
  };
}
