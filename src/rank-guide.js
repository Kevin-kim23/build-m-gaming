import { fmt } from './format.js';
import { FORMATIONS } from './formations.js';
import { RANK_DEFINITIONS, rankForArmy, LAST_RANK, promotionProgress } from './ranks.js';
import { drawFormationPortrait } from './art.js';
import { openDetail } from './detail-popup.js';

// Opened from the rank badge at the top left of the home screen.
export function rankGuideMarkup(state, insignia) {
  const rank = rankForArmy(state);
  const next = rank === LAST_RANK ? `${RANK_DEFINITIONS[rank].name} 달성!`
    : `${RANK_DEFINITIONS[rank + 1].name} 진급 조건: ${promotionProgress(state).text}`;
  const steps = RANK_DEFINITIONS.map((r, i) => `<div class="rank-step${i <= rank ? ' reached' : ''}${i === rank ? ' current' : ''}" data-rank="${i}">${insignia(i)}<b>${r.name}</b><small>전력 ${fmt(r.required)}</small><em>${i >= 4 ? r.condition : ''}</em></div>`).join('');
  const formations = FORMATIONS.filter((f) => f.id !== 'soldier').slice().reverse()
    .map((f) => `<div><canvas data-formation="${f.id}" width="96" height="82" role="img" aria-label="${f.name} 건물 아이콘"></canvas><b>${f.name}</b><span>전력 ${fmt(f.size)}</span></div>`).join('');
  return `<div class="rank-guide"><p>전력이 쌓이면 조건을 채웠을 때 자동으로 진급합니다.</p>
    <p class="rank-next" id="rank-next">${next}</p>
    <div class="rank-steps">${steps}</div>
    <h3 class="rank-guide-title">분대부터 총군사령부까지 · 편제 안내</h3>
    <p>총 전력으로 묶어 표시합니다. 실제 보유 인원은 그대로입니다. 대위부터 분대 이상, 대대부터 소대 이상, 연대부터 중대 이상, 사단부터 대대 이상, 군단부터 연대 이상, 야전군부터 사단 이상, 집단군부터 군단 이상, 연합군부터 야전군 이상, 대연합군부터 집단군 이상, 총군사령부부터 연합군 이상만 연병장에 표시합니다. 공간이 부족하면 같은 편제를 수량으로 묶거나 작은 편제를 생략하고 가장 큰 본부를 남깁니다.</p>
    <div class="formation-guide-grid">${formations}</div></div>`;
}

export function openRankGuide(state, insignia) {
  const dialog = openDetail({ kicker: 'RANK', title: '계급과 편제', body: rankGuideMarkup(state, insignia) });
  dialog.querySelectorAll('[data-formation]').forEach((c) => drawFormationPortrait(c, c.dataset.formation));
  dialog.querySelector('.rank-step.current')?.scrollIntoView?.({ block: 'center' });
}
