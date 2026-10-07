// Audio IDs are shared by playback, production tools and asset verification.
// Playback uses local synthesis; no audio files, ElevenLabs API, keys or network services are needed.
export const GEAR_SOUND_IDS = ['artillery', 'tank', 'selfPropelled', 'helicopter', 'rocketLauncher', 'transport', 'fighter', 'railgunTank', 'icbm', 'carrier', 'flyingFortress', 'orbitalAssault'];
export const UI_SOUND_IDS = ['tap', 'click', 'recruit', 'purchase', 'build', 'equip', 'upgrade-success', 'upgrade-fail', 'promotion', 'medal', 'sword', 'revolver', 'error', 'unlock'];
export const BATTLE_SOUND_IDS = ['turret-shot', 'impact', 'explosion', 'base-hit', 'battle-start', 'victory', 'defeat', 'draw'];
export const SFX_IDS = [...GEAR_SOUND_IDS.flatMap(id => [`${id}-action`, `${id}-deploy`]), ...BATTLE_SOUND_IDS, ...UI_SOUND_IDS];
export const AUDIO_IDS = new Set(SFX_IDS);
export const audioUrl = id => AUDIO_IDS.has(id) ? `./audio/sfx/${id}.mp3` : null;
export function battleSound(kind, gearId) {
  if (kind === 'deploy') return GEAR_SOUND_IDS.includes(gearId) ? `${gearId}-deploy` : 'equip';
  if (kind === 'shot' || kind === 'heal' || kind === 'strike') return GEAR_SOUND_IDS.includes(gearId) ? `${gearId}-action` : 'turret-shot';
  return ({ impact:'impact', boom: 'explosion', hit: 'base-hit', win: 'victory', lose: 'defeat', draw: 'draw', start: 'battle-start' })[kind] ?? null;
}
// Gains complement normalized media; repeated touch/gun sounds stay quieter than milestones.
export const soundGain = id => id === 'tap' ? 0.16 : id === 'click' ? 0.20 : id.endsWith('-action') ? 0.36 : id.endsWith('-deploy') ? 0.26 : ['promotion', 'victory', 'defeat', 'draw'].includes(id) ? 0.6 : 0.42;
export const soundGap = id => id === 'tap' ? 45 : id === 'click' ? 70 : id.endsWith('-action') ? 120 : id.endsWith('-deploy') ? 90 : 100;
