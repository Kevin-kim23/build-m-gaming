import { fmt } from './format.js';
import { FORMATIONS } from './formations.js';
import { RANK_DEFINITIONS, rankForArmy } from './ranks.js';
import { drawFormationPortrait } from './art.js';
import { openDetail } from './detail-popup.js';

// Opened from the rank badge at the top left of the home screen.
function rankFormationLabel(rank) {
  const formation=FORMATIONS.find(f=>f.id!=='soldier'&&f.size===rank.required);
  return formation?'1개 '+formation.name:rank.condition.split(' · ')[0];
}
export function rankGuideMarkup(state, insignia) {
  const rank = rankForArmy(state);
  const steps = RANK_DEFINITIONS.map((r, i) => `<div class="rank-step${i <= rank ? ' reached' : ''}${i === rank ? ' current' : ''}" data-rank="${i}">${insignia(i)}<b>${r.name}</b><small>전력 ${fmt(r.required)}</small><em>${i >= 4 ? rankFormationLabel(r) : ''}</em></div>`).join('');
  const formations = FORMATIONS.filter((f) => f.id !== 'soldier').slice().reverse()
    .map((f) => `<div><canvas data-formation="${f.id}" width="96" height="82" role="img" aria-label="${f.name} 건물 아이콘"></canvas><b>${f.name}</b><span>전력 ${fmt(f.size)}</span></div>`).join('');
  return `<div class="rank-guide">
    <div class="rank-steps">${steps}</div>
    <h3 class="rank-guide-title">부대 편제 안내</h3>
    <div class="formation-guide-grid">${formations}</div></div>`;
}

export function openRankGuide(state, insignia) {
  const dialog = openDetail({ kicker: 'RANK', title: '계급과 편제', body: rankGuideMarkup(state, insignia) });
  dialog.querySelectorAll('[data-formation]').forEach((c) => drawFormationPortrait(c, c.dataset.formation));
  dialog.querySelector('.rank-step.current')?.scrollIntoView?.({ block: 'center' });
}
