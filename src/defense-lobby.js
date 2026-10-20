// 무한 방어전 입장 화면과 결과 화면 글자(HTML). 저장 기록(state.defense)을 보여 주고, 각성·출격 버튼을 둔다.
import { LINES, RANK_START_LEVEL } from './defense-data.js';
import { baseStats } from './defense-economy.js';
import { defenseOf, rewardsLeft, awakenCost, DAILY_REWARDS, AWAKEN_COSTS, AWAKEN_STEP, LOOT_PER_WAVE } from './defense-progress.js';

const n = v => Math.floor(v).toLocaleString('ko-KR');
const dateText = ms => { const d = new Date(ms); return `${d.getMonth() + 1}월 ${d.getDate()}일`; };
const stars = level => '★'.repeat(level) + '☆'.repeat(AWAKEN_COSTS.length - level);

export function lobbyMarkup(state, rankName, now = Date.now()) {
  const d = defenseOf(state), start = RANK_START_LEVEL[rankName] ?? 1, ranks = Object.keys(RANK_START_LEVEL);
  const next = ranks[ranks.indexOf(rankName) + 1];
  const awakenRow = line => {
    const level = d.awaken[line], cost = awakenCost(level);
    return `<div class="defense-awaken"><span>${LINES[line].name} <b>${stars(level)}</b><small>공격 +${Math.round(level * AWAKEN_STEP * 100)}%</small></span>${cost === null
      ? '<em>최고</em>'
      : `<button type="button" class="defense-btn" data-awaken="${line}"${d.medals < cost ? ' disabled' : ''}>각성 · 훈장 ${cost}</button>`}</div>`;
  };
  return `<div class="defense-lobby">
    <p class="defense-dim">무한 방어전</p>
    <h2 id="defense-title" class="defense-lobby-title">${d.best ? `최고 기록 ${n(d.best)}웨이브` : '첫 도전'}</h2>
    ${d.best ? `<p class="defense-dim">${dateText(d.bestAt)} 달성</p>` : ''}
    <button type="button" class="defense-btn primary big" data-defense-start>출격</button>
    <div class="defense-stats">
      <div><span>계급 <b class="defense-rank">${rankName}</b></span><b class="defense-gold-text">시작 기지 Lv${start}</b></div>
      <div><span>시작 초당 보급</span><b>${baseStats(start).perSecond.toFixed(1)}</b></div>
      ${next ? `<div><span>다음 계급 ${next}</span><b>Lv${RANK_START_LEVEL[next]}부터</b></div>` : ''}
      <div><span>오늘 보상</span><b>${rewardsLeft(state, now)} / ${DAILY_REWARDS}판 남음</b></div>
      <div><span>보상</span><b>웨이브당 전리품 ${LOOT_PER_WAVE} · 방어 훈장 1</b></div>
    </div>
    <details class="defense-more"><summary>방어 훈장 <b>${n(d.medals)}</b> · 계열 각성 열기</summary>
      <div class="defense-stats">${Object.keys(LINES).map(awakenRow).join('')}</div></details>
    <div class="defense-panel-row"><button type="button" class="defense-btn" data-defense-close>나가기</button></div>
  </div>`;
}

export function resultMarkup(run, best, reward) {
  const rewardRows = !reward ? '<div><span>보상</span><b>저장하지 못했어요 · 앱을 다시 켜 주세요</b></div>' : reward.rewarded
    ? `<div><span>전리품</span><b class="defense-gold-text">+${n(reward.loot)}</b></div><div><span>방어 훈장</span><b>+${n(reward.medals)}</b></div><div><span>오늘 남은 보상</span><b>${reward.left}판</b></div>`
    : `<div><span>보상</span><b>${run.cleared > 0 ? '오늘 보상 3판을 다 받았어요 · 기록만 저장' : '0웨이브는 보상이 없어요'}</b></div>`;
  return `<p class="defense-dim">무한 방어전 종료</p><p class="defense-big">${run.cleared} 웨이브</p>
    ${reward?.newBest ? '<p class="defense-gold">최고 기록 경신!</p>' : `<p class="defense-dim">최고 기록 ${best}웨이브</p>`}
    <div class="defense-stats"><div><span>처치한 적</span><b>${n(run.stats.kills)}</b></div><div><span>시간</span><b>${Math.floor(run.time / 60)}분 ${Math.floor(run.time % 60)}초</b></div>${rewardRows}</div>
    <div class="defense-panel-row"><button type="button" class="defense-btn" data-defense-lobby>나가기</button><button type="button" class="defense-btn primary" data-defense-retry>다시 도전</button></div>`;
}
