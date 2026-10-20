// 무한 방어전 화면 글자(HTML): 상단 줄, 짓기 메뉴, 장비·기지 패널, 결과. 열 때·누를 때만 만든다(매 프레임 아님).
// 그림(전장)은 defense-art.js가 캔버스에 그리고, 이름표·레벨은 선명한 HTML로 위에 얹는다.
import { MAP, PADS, BASE_POS, LINES, BAYS, TOWERS, MAX_LEVEL, COMMON_TRAITS, BRANCH_TRAITS, BASE_MAX_LEVEL, EVOLVE_LEVELS, BAY_EVOLVE_LEVEL } from './defense-data.js';
import { CARDS, evolvable } from './defense-cards.js';
import { baseStats, baseUpgradeCost, bayBuildCost, upgradeCost, upgradeCostTo, nextChoiceLevel, sellRefund, callEarlyBonus } from './defense-economy.js';
import { towerId, towerStats } from './defense-run.js';

export const BAY_POS = Object.freeze({ transport: Object.freeze([52, 690]), recon: Object.freeze([308, 690]) });
export const LINE_TEXT = Object.freeze({ armor: '지상 연사', firepower: '지상 범위', air: '공중 담당' });
const pct = (v, total) => `${(v / total * 100).toFixed(3)}%`;
const at = ([x, y]) => `left:${pct(x, MAP.width)};top:${pct(y, MAP.height)}`;
const n = v => Math.floor(v).toLocaleString('ko-KR');

// 전장 크기: 화면 안에 360:780 비율로 꽉 차게.
export function fieldFit(width, height) {
  const scale = Math.max(0.1, Math.min(width / MAP.width, height / MAP.height));
  return { scale, width: Math.floor(MAP.width * scale), height: Math.floor(MAP.height * scale) };
}

// 누른 곳(전장 좌표) → 자리 / 지원 칸 / 기지.
export function hitTest(x, y) {
  const pad = PADS.findIndex(([px, py]) => Math.abs(px - x) <= 30 && Math.abs(py - y) <= 30);
  if (pad >= 0) return { pad };
  for (const [bay, [bx, by]] of Object.entries(BAY_POS)) if (Math.abs(bx - x) <= 32 && Math.abs(by - y) <= 32) return { bay };
  if (Math.abs(BASE_POS[0] - x) <= 56 && Math.abs(BASE_POS[1] - y) <= 34) return { base: true };
  return null;
}

export function defenseMarkup({ rankName, starSvg }) {
  return `<div class="defense-frame">
  <div class="defense-field" data-defense-field>
    <canvas data-defense-canvas aria-label="무한 방어전 전장"></canvas>
    <div class="defense-labels" aria-hidden="true">
      ${PADS.map((p, i) => `<span class="defense-lv" data-pad-lv="${i}" style="${at([p[0] + 22, p[1] - 27])}" hidden></span>`).join('')}
      ${Object.entries(BAY_POS).map(([id, p]) => `<span class="defense-bay-name" style="${at([p[0], p[1] + 40])}">${BAYS[id].name}</span><span class="defense-lv bay" data-bay-lv="${id}" style="${at([p[0] + 22, p[1] - 27])}" hidden></span>`).join('')}
      <span class="defense-star" style="${at(BASE_POS)}" title="${rankName}">${starSvg}</span>
    </div>
    <div class="defense-hud">
      <div class="defense-row">
        <h2 id="defense-title" class="defense-chip">WAVE <b data-d="wave">1</b></h2>
        <span class="defense-chip blue" data-d="timer"></span>
        <span class="defense-fill"></span>
        <span class="defense-chip red">♥ <b data-d="hearts">20</b></span>
        <span class="defense-chip green defense-supply" aria-label="보급"><b data-d="supply">0</b><small>/<span data-d="cap">0</span></small><i data-d="supplybar"></i></span>
      </div>
    </div>
    <div class="defense-actions">
      <button type="button" class="defense-btn" data-defense-close data-back-first aria-label="이번 판 끝내기">✕ 끝내기</button>
      <button type="button" class="defense-btn" data-defense-speed>x1</button>
      <button type="button" class="defense-btn primary" data-defense-early hidden>바로! <b data-d="early">+0</b></button>
    </div>
    <div class="defense-left">
      <button type="button" class="defense-card-btn" data-defense-cards hidden>카드<b data-d="cards">0</b></button>
      <button type="button" class="defense-btn evo" data-defense-evo hidden>진화권 <b data-d="evo">0</b></button>
      <button type="button" class="defense-btn skill" data-defense-icbm hidden>ICBM <small data-d="icbm"></small></button>
    </div>
    <p class="defense-hint" data-defense-hint hidden></p>
    <div class="defense-boss" data-defense-boss hidden><b data-d="bossname"></b><span><i data-d="bossbar"></i></span></div>
    <div class="defense-banner" data-defense-banner hidden><b data-d="bannertitle"></b><small data-d="bannertext"></small></div>
    <div class="defense-panel" data-defense-panel hidden></div>
    <div class="defense-cards" data-defense-hand hidden></div>
    <div class="defense-result" data-defense-result hidden></div>
  </div>
</div>`;
}

const sprite = (id, w = 36) => `<canvas class="defense-sprite" data-gear-sprite="${id}" style="width:${w}px" aria-hidden="true"></canvas>`;
const costButton = (label, cost, attrs, run, extra = '') => `<button type="button" class="defense-btn${extra}" ${attrs} data-cost="${cost}"${run.supply < cost ? ' disabled' : ''}>${label} · ${n(cost)}</button>`;

export function buildMenuMarkup(run, pad) {
  return `<p class="defense-panel-title">빈자리 ${pad + 1} · 무엇을 지을까?</p><div class="defense-opts">
    ${Object.entries(LINES).map(([line, def]) => `<button type="button" class="defense-opt" data-build="${line}" data-cost="${def.buildCost}"${run.supply < def.buildCost ? ' disabled' : ''}>
      ${sprite(def.path[0])}<b>${def.name}</b><small>${LINE_TEXT[line]}</small><span class="defense-cost">${def.buildCost}</span></button>`).join('')}
  </div><div class="defense-panel-row"><button type="button" class="defense-btn" data-panel-close>닫기</button></div>`;
}

export function towerPanelMarkup(run, pad, { moving = false } = {}) {
  const t = run.pads[pad], id = towerId(t), s = towerStats(run, t), base = LINES[t.line].buildCost;
  const pending = [30, 40].find(l => t.level >= l && t.traits[l] === undefined);
  const next = nextChoiceLevel(t.level);
  const stage = t.stage === 0 ? '진화 전' : t.stage === 1 ? '1차 진화' : '2차 진화';
  let body;
  if (pending === 30) body = `<p class="defense-note">Lv30 특성을 골라야 더 올릴 수 있어요</p><div class="defense-panel-row">${COMMON_TRAITS.map((tr, i) => `<button type="button" class="defense-btn primary" data-trait="30:${i}">${tr.name}</button>`).join('')}</div>`;
  else if (pending === 40 && t.stage === 2) body = `<p class="defense-note">Lv40 갈래 특성을 골라 주세요</p><div class="defense-panel-row">${BRANCH_TRAITS[id].map((tr, i) => `<button type="button" class="defense-btn primary" data-trait="40:${i}">${tr.name}</button>`).join('')}</div>`;
  else if (pending === 40) body = '<p class="defense-note">Lv40 특성은 2차 진화(갈래) 뒤에 열려요</p>';
  else if (t.level >= MAX_LEVEL) body = '<p class="defense-note">최고 레벨이에요</p>';
  else {
    const to = Math.min(next ?? MAX_LEVEL, MAX_LEVEL);
    body = `<div class="defense-panel-row">${costButton('+1', upgradeCost(base, t.level), 'data-upgrade="1"', run)}${to - t.level > 1 ? costButton(`Lv${to}까지`, upgradeCostTo(base, t.level, to), `data-upgrade="${to - t.level}"`, run, ' primary') : ''}</div>`;
  }
  return `<div class="defense-head">${sprite(TOWERS[id].art, 40)}<div><b>${TOWERS[id].name} Lv${t.level}</b>
    <small>${LINES[t.line].name} · ${stage} · 공격 ${n(s.damage)} · 사거리 ${Math.round(s.range)}</small></div></div>
    ${evolveRow(run, pad)}
    ${body}
    <div class="defense-panel-row">
      <button type="button" class="defense-btn${moving ? ' primary' : ''}" data-move>${moving ? '옮길 자리를 누르세요' : '옮기기'}</button>
      <button type="button" class="defense-btn" data-sell>팔기 +${n(sellRefund(t.spent))}</button>
      <button type="button" class="defense-btn" data-panel-close>닫기</button>
    </div>`;
}

const BAY_BRANCH_NAMES = Object.freeze({ flyingFortress: '공중요새 · 사거리 +15%', transportWing: '수송 편대 · 보급 +20%', globalRadar: '전역 레이더 · 맵 전체 탐지', targetMark: '표적 지정 · 보스 피해 +25%' });
// 진화: 진화권(희귀 카드)으로만. 1차 Lv10, 2차 갈래 Lv20. 레벨은 그대로.
export function evolveRow(run, pad) {
  const t = run.pads[pad];
  if (t.stage >= 2) return '';
  const path = LINES[t.line].path, need = EVOLVE_LEVELS[t.stage];
  const targets = t.stage === 0 ? [path[1]] : path[2];
  const names = targets.map(id => TOWERS[id].name).join(' / ');
  if (t.level < need) return `<p class="defense-evo-note">Lv${need}부터 진화권으로 진화 → ${names}</p>`;
  if (run.evoTickets < 1) return `<p class="defense-evo-note">진화 가능 (Lv${need} ✓) · 진화권 카드가 필요해요 → ${names}</p>`;
  return `<div class="defense-panel-row">${targets.map((id, i) => `<button type="button" class="defense-btn evo" data-evolve="${i}">진화 → ${TOWERS[id].name}</button>`).join('')}</div>`;
}
function bayEvolveRow(run, bay) {
  const b = run.bays[bay];
  if (!b || b.branch) return b?.branch ? `<p class="defense-evo-note">진화: ${BAY_BRANCH_NAMES[b.branch]}</p>` : '';
  const names = BAYS[bay].branches.map(id => BAY_BRANCH_NAMES[id]);
  if (b.level < BAY_EVOLVE_LEVEL || run.evoTickets < 1) return `<p class="defense-evo-note">Lv${BAY_EVOLVE_LEVEL} + 진화권 → ${names.join(' / ')}</p>`;
  return `<div class="defense-panel-row">${names.map((name, i) => `<button type="button" class="defense-btn evo" data-bay-evolve="${i}">${name}</button>`).join('')}</div>`;
}

// 카드 3장 고르기(전투는 멈춤).
export function cardsMarkup(run) {
  const label = card => card.id === 'lineFocus' ? `${LINES[card.line].name} 특화` : CARDS[card.id].name;
  const text = card => card.id === 'lineFocus' ? `${LINES[card.line].name} 공격 +20%` : CARDS[card.id].text;
  const rarity = { common: '일반', rare: '희귀', legendary: '전설' };
  return `<p class="defense-dim">쌓인 카드 ${run.storedCards}장 · 1장 고르기</p><h3 class="defense-cards-title">보상 카드</h3>
    <div class="defense-picks">${run.hand.map((card, i) => `<button type="button" class="defense-pick ${CARDS[card.id].rarity}" data-pick="${i}">
      <span class="defense-rarity">${rarity[CARDS[card.id].rarity]}</span><b>${label(card)}</b><small>${text(card)}</small></button>`).join('')}</div>
    <div class="defense-panel-row"><button type="button" class="defense-btn" data-reroll${run.rerolls < 1 ? ' disabled' : ''}>다시 뽑기 ${run.rerolls}</button></div>`;
}

export function basePanelMarkup(run, tab = 'base') {
  const tabs = [['base', `기지 Lv${run.baseLevel}`], ...Object.entries(BAYS).map(([id, b]) => [id, run.bays[id] ? `${b.name.split(' ')[0]} Lv${run.bays[id].level}` : b.name.split(' ')[0]])];
  let body;
  if (tab === 'base') {
    const now = baseStats(run.baseLevel), next = run.baseLevel < BASE_MAX_LEVEL ? baseStats(run.baseLevel + 1) : null;
    const row = (label, a, b) => `<div><span>${label}</span><b>${a}${next ? ` → ${b}` : ''}</b></div>`;
    body = `<div class="defense-stats">${row('보급 간격', `${now.interval.toFixed(2)}초`, next && `${next.interval.toFixed(2)}초`)}${row('한 번에', `+${now.amount}`, next && `+${next.amount}`)}${row('보급 상한', n(now.cap), next && n(next.cap))}${row('초당 보급', now.perSecond.toFixed(1), next && next.perSecond.toFixed(1))}</div>
      <div class="defense-panel-row">${next ? costButton('기지 강화', baseUpgradeCost(run.baseLevel + 1), 'data-base-up', run, ' primary') : '<p class="defense-note">기지 최고 레벨</p>'}</div>`;
  } else {
    const b = run.bays[tab], text = tab === 'transport' ? '모든 장비 공격 속도 +1%/Lv · Lv10부터 웨이브마다 ♥ +1' : '위장 적을 보이게 하는 레이더 · Lv10부터 레이더 안 적 피해 +10%';
    body = `<p class="defense-note">${text}</p>${bayEvolveRow(run, tab)}<div class="defense-panel-row">${b
      ? (b.level < MAX_LEVEL ? costButton(`Lv${b.level + 1}`, upgradeCost(BAYS[tab].buildCost, b.level), `data-bay-up="${tab}"`, run, ' primary') : '<p class="defense-note">최고 레벨</p>')
      : costButton('짓기', bayBuildCost(tab), `data-bay-build="${tab}"`, run, ' primary')}</div>`;
  }
  return `<div class="defense-tabs">${tabs.map(([id, label]) => `<button type="button" data-base-tab="${id}"${id === tab ? ' class="on"' : ''}>${label}</button>`).join('')}</div>${body}
    <div class="defense-panel-row"><button type="button" class="defense-btn" data-panel-close>닫기</button></div>`;
}

// 상단 줄 숫자(매 프레임 비교 후 바뀐 것만 쓴다).
export const evolveTargets = run => evolvable(run);
// 가장 앞선 보스 하나의 이름·남은 체력(없으면 빈 값).
function bossValues(run) {
  const boss = run.enemies.find(e => e.big) ?? run.enemies.find(e => e.boss);
  if (!boss) return { bossname: '', bossbar: '0%' };
  return { bossname: boss.def.name, bossbar: `${Math.max(0, Math.round(boss.hp / boss.maxHp * 100))}%` };
}
export function hudValues(run) {
  const b = baseStats(run.baseLevel);
  return {
    wave: String(Math.max(1, run.wave)), hearts: String(run.hearts), supply: n(run.supply), cap: n(b.cap),
    supplybar: `${Math.round(run.supply / b.cap * 100)}%`,
    timer: run.phase === 'gap' ? `다음 0:0${Math.max(0, Math.ceil(run.gapLeft))}` : `남은 적 ${run.enemies.length + run.queue.length}`,
    early: `+${callEarlyBonus(run.gapLeft)}`,
    cards: String(run.storedCards), evo: String(run.evoTickets),
    icbm: run.skills.icbm ? (run.skills.icbm.ready > 0 ? `${Math.ceil(run.skills.icbm.ready)}초` : '준비') : '',
    ...bossValues(run), bannertitle: run.banner?.title ?? '', bannertext: run.banner?.text ?? '',
  };
}
