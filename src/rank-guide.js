import { fmt } from './format.js';
import { FORMATIONS } from './formations.js';
import { RANK_DEFINITIONS, rankForArmy } from './ranks.js';
import { drawFormationPortrait } from './art.js';
import { openDetail } from './detail-popup.js';
import { drawCharacterPortrait } from './character-art.js';

// Guide labels only. Promotion thresholds, save values and other number labels
// retain their full precision; e.g. 5,242,880 is displayed as 524만, never 525만.
export function compactGuidePower(value) {
  if ((typeof value !== 'number' && typeof value !== 'bigint') || value < 0 ||
      (typeof value === 'number' && !Number.isSafeInteger(value)))
    throw new RangeError('Guide power must be a non-negative safe integer or bigint.');
  const units=['','만','억','조','경','해'];
  let power=BigInt(value),unit=0;
  while(power>=10_000n&&unit<units.length-1){power/=10_000n;unit++;}
  return unit ? `${power}${units[unit]}` : fmt(power);
}

// Opened from the rank badge at the top left of the home screen.
function rankFormationLabel(rank) {
  const formation=FORMATIONS.find(f=>f.id!=='soldier'&&f.size===rank.required);
  return formation?'1개 '+formation.name:rank.condition.split(' · ')[0];
}
export function rankGuideMarkup(state, insignia) {
  const rank = rankForArmy(state);
  const steps = RANK_DEFINITIONS.map((r, i) => `<div class="rank-step${i <= rank ? ' reached' : ''}${i === rank ? ' current' : ''}" data-rank="${i}">${insignia(i)}<canvas class="rank-character" data-character="${i}" width="96" height="120" role="img" aria-label="${r.name} 캐릭터"></canvas><b>${r.name}</b><small>${compactGuidePower(r.required)} 전력</small><em>${i >= 4 ? rankFormationLabel(r) : ''}</em></div>`).join('');
  const formations = FORMATIONS.filter((f) => f.id !== 'soldier').slice().reverse()
    .map((f) => `<div><canvas data-formation="${f.id}" width="96" height="82" role="img" aria-label="${f.name} 건물 아이콘"></canvas><b>${f.name}</b><span>${compactGuidePower(f.size)} 전력</span></div>`).join('');
  return `<div class="rank-guide">
    <div class="rank-steps">${steps}</div>
    <h3 class="rank-guide-title">부대 편제 안내</h3>
    <div class="formation-guide-grid">${formations}</div></div>`;
}

export function openRankGuide(state, insignia) {
  const dialog = openDetail({ kicker: 'RANK', title: '계급과 편제', body: rankGuideMarkup(state, insignia) });
  dialog.querySelectorAll('[data-formation]').forEach((c) => drawFormationPortrait(c, c.dataset.formation));
  dialog.querySelectorAll('[data-character]').forEach(c=>drawCharacterPortrait(c,Number(c.dataset.character)));
  dialog.querySelector('.rank-step.current')?.scrollIntoView?.({ block: 'center' });
}
