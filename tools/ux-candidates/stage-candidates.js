// Five battle-home (stage select) candidates. Pure markup + local selection state.
import {SAMPLE, STAGES, ASTERA_COUNTRIES, STARTER_DECK, card, starsOf, statusOf, STATUS_NAME, rewardOf, countryOf, icon, avgCost, art, manaGem} from './data.js';
import {battleStarsMarkup} from '../../src/battle-icons.js';
import {lootIcon} from '../../src/operative-art.js';
import {countryRegions, polygonPath, bounds} from '../../src/campaign-geometry.js';
import {mapDefs, oceanArt, countryLand} from '../../src/campaign-art.js';

const fmt = n => n.toLocaleString('ko-KR');
const MY_POWER = 9400;
const stage = id => STAGES[id - 1];
const lockAttr = id => statusOf(id) === 'locked' ? 'disabled' : '';
function verdict(s) {
  const ratio = MY_POWER / s.recommendedPower;
  return ratio >= 1.1 ? ['good', '여유'] : ratio >= .9 ? ['ok', '적정'] : ['hard', '어려움'];
}
// Shared sticky footer: what you picked, whether you can win, the reward, and one big action.
export function stageFooter(id, {deck = false} = {}) {
  const s = stage(id), st = statusOf(id), [tone, label] = verdict(s);
  return `<div class="stage-sheet">
    <div class="sheet-row"><div class="sheet-title"><small>${s.enemyName}${s.capital ? ' · 수도전' : ''}</small><strong>${s.name}</strong></div>
      <span class="power-chip tone-${tone}" title="내 전력 ${fmt(MY_POWER)} / 권장 ${fmt(s.recommendedPower)}">${label}</span></div>
    <div class="sheet-meta"><span>권장 ${s.recommendedRank} · 장비 +${s.recommendedLevel}</span><span class="reward-chip">${lootIcon()}${fmt(rewardOf(id))}<small>${st === 'done' ? '재도전' : '첫 승리'}</small></span></div>
    ${deck ? deckStrip() : ''}
    <button type="button" class="cta" ${lockAttr(id)} data-cta>${st === 'locked' ? `${icon('lock')} 이전 스테이지를 먼저 완료` : st === 'done' ? '다시 출격' : '출격'}</button></div>`;
}
function deckStrip() {
  return `<div class="deck-strip" aria-label="현재 출격 장비"><div class="deck-mini">${STARTER_DECK.map(id => `<span class="mini-card cls-${card(id).cls}">${art(id, 60, 34)}${manaGem(card(id))}</span>`).join('')}</div>
    <button type="button" class="ghost-btn">편성 바꾸기 <small>평균 마나 ${avgCost(STARTER_DECK)}</small></button></div>`;
}
const continentBar = () => `<div class="continent-bar"><b>아스테라</b><span class="progress"><i style="width:${SAMPLE.cleared / 80 * 100}%"></i></span><small>${SAMPLE.cleared} / 80</small><span class="continent-lock">${icon('lock')} 에테리온</span></div>`;
const head = (title, sub) => `<header class="phone-head"><div><small>${sub}</small><h3>${title}</h3></div><button type="button" class="icon-btn" aria-label="닫기">${icon('left')}</button></header>`;

// 1 · Command room: one big current-stage card and one big button, like a lobby "Battle" button.
function commandRoom(id) {
  const s = stage(id), c = countryOf(id), st = statusOf(id);
  return `${head('작전 사령실', '전투')}${continentBar()}
  <div class="phone-content pad">
    <div class="hero-stage" style="--country:${c.color};--country-dark:${c.dark}">
      <button type="button" class="hero-nav prev" data-step="-1" aria-label="이전 스테이지" ${id <= 1 ? 'disabled' : ''}>${icon('left')}</button>
      <div class="hero-body"><small>${c.name} · ${s.region} / 20</small><strong>스테이지 ${s.continentStage}</strong><span>${s.regionName}</span>
        <div class="hero-stars">${st === 'done' ? battleStarsMarkup(starsOf(id), true) : `<em>${STATUS_NAME[st]}</em>`}</div></div>
      <button type="button" class="hero-nav next" data-step="1" aria-label="다음 스테이지" ${id >= SAMPLE.current ? 'disabled' : ''}>${icon('right')}</button>
    </div>
    <div class="goal-row"><span>${icon('info')} 적 ${s.enemyName}</span><span>권장 전력 ${fmt(s.recommendedPower)}</span><span>내 전력 ${fmt(MY_POWER)}</span></div>
    <button type="button" class="link-btn" data-open-list>전체 스테이지 보기 ${icon('right')}</button>
  </div>
  <footer class="phone-footer">${stageFooter(id, {deck: true})}</footer>`;
}
// 2 · Conquest road: one stage per step, climbing from 1 (bottom) to 80 (top) in a gentle zigzag.
// Background is the real Astera map, scaled so its south-to-north length matches the climb (no place names).
const STEP = 88, ROAD_PAD = 90, ROAD_H = STEP * 79 + ROAD_PAD * 2;
const ZIG = [50, 70, 78, 70, 50, 30, 22, 30];
const roadX = n => ZIG[(n - 1) % ZIG.length];
const roadY = n => ROAD_H - ROAD_PAD - (n - 1) * STEP;
function conquestRoad(id) {
  const path = Array.from({length: 80}, (_, i) => `${roadX(i + 1)},${roadY(i + 1)}`);
  const nodes = STAGES.map(s => {
    const n = s.id, st = statusOf(n), cap = n % 20 === 0;
    return `<button type="button" class="climb-node ${st}${n === id ? ' selected' : ''}${cap ? ' capital' : ''}" style="left:${roadX(n)}%;top:${roadY(n)}px" data-pick="${n}" ${lockAttr(n)} aria-pressed="${n === id}" aria-label="스테이지 ${n} ${STATUS_NAME[st]}${cap ? ' 수도' : ''}">
      ${cap ? '<span class="cap-flag" aria-hidden="true"></span>' : ''}<b>${st === 'locked' ? icon('lock') : n}</b>${st === 'done' ? `<span class="climb-stars">${battleStarsMarkup(starsOf(n))}</span>` : st === 'current' ? '<span class="climb-now">지금 도전</span>' : ''}</button>`;
  }).join('');
  // A narrow centre slice of the 1000x2500 map keeps its true proportions at this height.
  const sliceW = Math.round(2500 * 100 / ROAD_H * 3.6);
  return `${head('진격 로드', '전투')}${continentBar()}<div class="phone-content climb" data-road>
    <div class="climb-canvas" style="height:${ROAD_H}px">
      <svg class="climb-bg" viewBox="${500 - sliceW / 2} 0 ${sliceW} 2500" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${mapDefs('astera')}${oceanArt('earth')}${ASTERA_COUNTRIES.map(c => countryLand(c)).join('')}</svg>
      <svg class="climb-road" viewBox="0 0 100 ${ROAD_H}" preserveAspectRatio="none" aria-hidden="true"><polyline points="${path.join(' ')}"/><polyline class="done" points="${path.slice(0, SAMPLE.current).join(' ')}"/></svg>
      ${nodes}</div></div>
    <footer class="phone-footer">${stageFooter(id)}</footer>`;
}

// 3 · Nation chapters: swipe nation cards; the chosen nation opens a 4x5 grid.
function nationChapters(id) {
  const chosen = countryOf(id);
  const cards = ASTERA_COUNTRIES.map(c => {
    const done = Math.max(0, Math.min(20, SAMPLE.cleared - c.firstStage + 1)), locked = SAMPLE.cleared < c.firstStage - 1;
    return `<button type="button" class="nation-card${c.id === chosen.id ? ' active' : ''}" data-nation="${c.firstStage}" ${locked ? 'disabled' : ''} style="--country:${c.color};--country-dark:${c.dark}" aria-pressed="${c.id === chosen.id}">
      <span class="ring" style="--p:${done / 20}"><b>${done}</b>/20</span><strong>${c.name}</strong><small>${locked ? '이전 국가 점령 필요' : c.terrain}</small></button>`;
  }).join('');
  const grid = Array.from({length: 20}, (_, i) => chosen.firstStage + i).map(n => {
    const st = statusOf(n);
    return `<button type="button" class="cell ${st}${n === id ? ' selected' : ''}${n % 20 === 0 ? ' capital' : ''}" data-pick="${n}" ${lockAttr(n)} aria-pressed="${n === id}" aria-label="스테이지 ${n} ${STATUS_NAME[st]}"><b>${n}</b>${st === 'done' ? `<span>${'★'.repeat(starsOf(n))}</span>` : st === 'locked' ? icon('lock') : '<span>도전</span>'}</button>`;
  }).join('');
  return `${head('국가 원정', '전투')}${continentBar()}<div class="phone-content"><div class="nation-row">${cards}</div><div class="cell-grid">${grid}</div></div><footer class="phone-footer">${stageFooter(id)}</footer>`;
}
// 4 · Operation list: rows with everything needed to decide, plus filters.
function operationList(id, filter = 'all') {
  const pass = n => filter === 'all' || (filter === 'open' && statusOf(n) !== 'locked') || (filter === 'stars' && statusOf(n) === 'done' && starsOf(n) < 3) || (filter === 'capital' && n % 20 === 0);
  const rows = STAGES.slice(0, 40).filter(s => pass(s.id)).map(s => {
    const st = statusOf(s.id);
    return `<button type="button" class="op-row ${st}${s.id === id ? ' selected' : ''}" data-pick="${s.id}" ${lockAttr(s.id)} aria-pressed="${s.id === id}">
      <b class="op-no">${s.id}</b><span class="op-main"><strong>${s.regionName}</strong><small>${s.enemyName} · 권장 ${s.recommendedRank}</small></span>
      <span class="op-side">${st === 'done' ? battleStarsMarkup(starsOf(s.id)) : st === 'current' ? '<em>도전</em>' : icon('lock')}<small>${lootIcon()}${fmt(rewardOf(s.id))}</small></span></button>`;
  }).join('') || '<p class="empty">조건에 맞는 스테이지가 없어요.</p>';
  const chip = (key, label) => `<button type="button" class="filter-chip" data-filter="${key}" aria-pressed="${filter === key}">${label}</button>`;
  return `${head('작전 목록', '전투')}${continentBar()}<div class="filters">${chip('all', '전체')}${chip('open', '도전 가능')}${chip('stars', '별 3개 미만')}${chip('capital', '수도')}</div><div class="phone-content"><div class="op-list">${rows}</div></div><footer class="phone-footer">${stageFooter(id)}</footer>`;
}
// 5 · Tactical map: the real nation outline, fixed (no drag/zoom), 20 numbered points on it.
function tacticalMap(id) {
  const c = countryOf(id), b = bounds(c.polygon), pad = 30;
  const box = `${b.x - pad} ${b.y - pad} ${b.width + pad * 2} ${b.height + pad * 2}`;
  const regions = countryRegions(c.id);
  const road = regions.map(r => r.point.map(Math.round).join(',')).join(' ');
  const points = regions.map(r => {
    const st = statusOf(r.id), [x, y] = r.point;
    return `<g class="map-node ${st}${r.id === id ? ' selected' : ''}" data-pick="${r.id}" role="button" tabindex="${st === 'locked' ? -1 : 0}" aria-disabled="${st === 'locked'}" aria-label="스테이지 ${r.id} ${STATUS_NAME[st]}"><circle cx="${x}" cy="${y}" r="${r.id % 20 === 0 ? 30 : 23}"/><text x="${x}" y="${y + 8}">${r.id}</text></g>`;
  }).join('');
  const tabs = ASTERA_COUNTRIES.map(n => `<button type="button" class="nation-tab" data-nation="${n.firstStage}" ${SAMPLE.cleared < n.firstStage - 1 ? 'disabled' : ''} aria-pressed="${n.id === c.id}">${n.name.split(' ')[0]}</button>`).join('');
  return `${head('전술 지도', '전투')}<div class="nation-tabs">${tabs}</div><div class="phone-content map-wrap"><svg class="tactical-map" viewBox="${box}" preserveAspectRatio="xMidYMid meet" aria-label="${c.name} 지도">
    <path d="${polygonPath(c.polygon)}" fill="${c.color}" stroke="${c.accent}" stroke-width="6"/><polyline points="${road}" class="map-road"/>${points}</svg></div><footer class="phone-footer">${stageFooter(id, {deck: true})}</footer>`;
}

export const STAGE_CANDIDATES = Object.freeze([
  {id: '1', title: '작전 사령실', tag: '가장 빠른 출격', render: commandRoom,
    copy: '열자마자 지금 도전할 스테이지 하나와 큰 출격 버튼만 보입니다. 다른 스테이지는 좌우 화살표나 전체 목록으로 이동합니다.',
    pros: '한 번 눌러 바로 전투, 첫 이용자도 헤매지 않음', cons: '여러 스테이지를 한눈에 비교하기는 어려움'},
  {id: '2', title: '진격 로드', tag: '성장하는 느낌', render: conquestRoad,
    copy: '스테이지가 한 칸씩 위로 이어지는 길. 아래에서 위로 하나씩 깨며 올라가고, 배경은 아스테라 대륙 지도입니다. 지금 도전이 가운데에 옵니다.',
    pros: '정복하는 재미, 현재 위치가 분명함', cons: '멀리 있는 번호는 스크롤이 필요'},
  {id: '3', title: '국가 원정', tag: '국가 단위 정리', render: nationChapters,
    copy: '국가 카드를 고르면 그 국가의 20칸 격자가 열립니다. 국가마다 진행률이 원형으로 보입니다.',
    pros: '200개를 국가 10개 단위로 나눠 찾기 쉬움', cons: '지도 감성은 약함'},
  {id: '4', title: '작전 목록', tag: '반복 전투에 강함', render: operationList,
    copy: '번호·지역·권장 계급·별·보상을 한 줄씩. 도전 가능/별 3개 미만/수도로 걸러 봅니다.',
    pros: '별 모으기·재도전이 가장 빠름', cons: '게임 분위기는 가장 덜함'},
  {id: '5', title: '전술 지도', tag: '지금 지도를 단순화', render: tacticalMap,
    copy: '지금 쓰는 국가 지도 모양을 유지하되 끌기·확대를 없애고 한 화면에 20칸을 모두 보여 줍니다.',
    pros: '기존 그림·느낌 유지, 학습 비용 적음', cons: '국가 지도 아트 비중이 큼'},
]);
