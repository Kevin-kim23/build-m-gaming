// 무한 방어전 손맛: 피해 숫자·처치 보급 글자·폭발 그림 목록과 효과음. 판 상태(run)의 사격·사건을 한 프레임에 한 번 읽는다.
// 소리는 본편 전투 합성음(audio.battle)을 그대로 쓰고, 같은 소리는 짧은 간격 안에 겹쳐 울리지 않게 한다.
import { reportError } from './diagnostics.js';

export const FLOAT_MS = 750, MAX_FLOATS = 28;
const GAP_MS = { shot: 90, hit: 110, boom: 160, deploy: 120, start: 300, win: 400, lose: 1000 };

export function createDefenseFeedback(soundOn, audio) {
  const floats = [], lastSound = {};
  let fxSeen = -1;
  const add = item => { if (floats.length >= MAX_FLOATS) floats.shift(); floats.push(item); };

  function sound(kind, gear = null) {
    const now = performance.now(), key = `${kind}:${gear ?? ''}`;
    if (now - (lastSound[key] ?? -1e9) < (GAP_MS[kind] ?? 100)) return;
    lastSound[key] = now;
    try { audio?.battle(kind, soundOn(), gear); } catch (error) { reportError('defense.sound', error); }
  }
  // 새 사격 → 피해 숫자·사격음, 새 사건 → 처치 글자·소리. 읽은 사건은 비운다.
  function drain(run, now) {
    for (const f of run.fx) {
      if (f.at <= fxSeen) continue;
      if (f.amount >= 1) add({ kind: 'text', x: f.x1 + ((f.at * 997) % 14) - 7, y: f.y1 - 14, text: `-${short(f.amount)}`, color: f.splash ? '#ffb08a' : '#fff2c8', born: now });
      sound('shot', f.art);
      if (f.splash) sound('boom');
    }
    if (run.fx.length) fxSeen = run.fx.at(-1).at;
    for (const e of run.events) {
      if (e.type === 'kill') { add({ kind: 'text', x: e.x, y: e.y - 22, text: `+${e.supply} 💰`, color: '#9fd3a8', born: now }); sound('hit'); }
      else if (e.type === 'bossKill') { add({ kind: 'text', x: e.x, y: e.y - 30, text: `보스 격파 +${e.supply}`, color: '#e6c27a', born: now }); sound('win'); }
      else if (e.type === 'leak') { add({ kind: 'text', x: e.x, y: e.y - 20, text: e.boss ? '♥ −5' : '♥ −1', color: '#ff8a7a', born: now }); sound('boom'); }
      else if (e.type === 'wave') sound('start');
    }
    run.events.length = 0;
    while (floats.length && now - floats[0].born > FLOAT_MS) floats.shift();
  }
  return {
    floats, drain, sound,
    blast: (x, y) => add({ kind: 'blast', x, y, born: performance.now() }),
    reset: () => { floats.length = 0; fxSeen = -1; },
  };
}
// 큰 피해 숫자는 짧게(1.2만 → 12K).
export function short(v) {
  if (v >= 1e6) return `${(v / 1e6).toFixed(v >= 1e7 ? 0 : 1)}M`;
  if (v >= 1e4) return `${(v / 1e3).toFixed(v >= 1e5 ? 0 : 1)}K`;
  return String(Math.round(v));
}
