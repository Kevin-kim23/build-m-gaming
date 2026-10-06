// Audio IDs are shared by playback, production tools and asset verification.
// The game reads bundled files only; no ElevenLabs API, key or network service is needed at runtime.
export const AUDIO_COUNTRIES = ['serdin', 'veloc', 'istra', 'norgard'];
export const AUDIO_PHASES = ['early', 'middle', 'late', 'capital'];
export const MUSIC_IDS = ['home', 'map', ...AUDIO_COUNTRIES.flatMap(id => AUDIO_PHASES.map(phase => `${id}-${phase}`))];
export const GEAR_SOUND_IDS = ['artillery', 'tank', 'selfPropelled', 'helicopter', 'rocketLauncher', 'transport', 'fighter', 'railgunTank', 'icbm'];
export const UI_SOUND_IDS = ['tap', 'click', 'recruit', 'purchase', 'build', 'equip', 'upgrade-success', 'upgrade-fail', 'promotion', 'medal', 'sword', 'revolver', 'error', 'unlock'];
export const BATTLE_SOUND_IDS = ['turret-shot', 'impact', 'explosion', 'base-hit', 'battle-start', 'victory', 'defeat', 'draw'];
export const SFX_IDS = [...GEAR_SOUND_IDS.flatMap(id => [`${id}-action`, `${id}-deploy`]), ...BATTLE_SOUND_IDS, ...UI_SOUND_IDS];
export const AUDIO_IDS = new Set([...MUSIC_IDS, ...SFX_IDS]);
export const audioUrl = id => AUDIO_IDS.has(id) ? `./audio/${MUSIC_IDS.includes(id) ? 'music' : 'sfx'}/${id}.mp3` : null;
export function musicForScene(scene = 'home', stageId = 0) {
  if (scene === 'map') return 'map';
  if (scene !== 'battle' || !Number.isInteger(stageId) || stageId < 1 || stageId > 80) return 'home';
  const region = (stageId - 1) % 20 + 1;
  return `${AUDIO_COUNTRIES[Math.floor((stageId - 1) / 20)]}-${region === 20 ? 'capital' : region <= 6 ? 'early' : region <= 13 ? 'middle' : 'late'}`;
}
export function battleSound(kind, gearId) {
  if (kind === 'deploy') return GEAR_SOUND_IDS.includes(gearId) ? `${gearId}-deploy` : 'equip';
  if (kind === 'shot' || kind === 'heal' || kind === 'strike') return GEAR_SOUND_IDS.includes(gearId) ? `${gearId}-action` : 'turret-shot';
  return ({ impact:'impact', boom: 'explosion', hit: 'base-hit', win: 'victory', lose: 'defeat', draw: 'draw', start: 'battle-start' })[kind] ?? null;
}
// Gains complement normalized media; repeated touch/gun sounds stay quieter than milestones.
export const soundGain = id => id === 'tap' ? 0.16 : id === 'click' ? 0.20 : id.endsWith('-action') ? 0.36 : id.endsWith('-deploy') ? 0.26 : ['promotion', 'victory', 'defeat', 'draw'].includes(id) ? 0.6 : 0.42;
export const soundGap = id => id === 'tap' ? 45 : id === 'click' ? 70 : id.endsWith('-action') ? 120 : id.endsWith('-deploy') ? 90 : 100;
