import { campaignBonusPercent } from './campaign-rewards.js';
import { stageBriefMarkup } from './campaign-brief.js';
import { COUNTRIES, CONTINENT, countryProgress, campaignStages } from './campaign.js';
import { fmt } from './format.js';
import { battleAccess } from './battle.js';

// 번호와 진행 상태만으로 고를 수 있는 목록. 지형·카메라와 저장 구조는 사용하지 않는다.
export function campaignSelection(state, countryId = null, selectedId = null) {
  const cleared = state.campaignCleared ?? 0;
  const current = campaignStages[Math.min(cleared, campaignStages.length - 1)];
  const requested = COUNTRIES.find(country => country.id === countryId);
  const country = requested && countryProgress(state, requested.id).unlocked
    ? requested : COUNTRIES.find(item => item.id === current.countryId);
  const requestedStage = campaignStages.find(stage => stage.id === selectedId && stage.countryId === country.id);
  const selected = requestedStage && requestedStage.id <= cleared + 1 ? requestedStage
    : campaignStages[Math.min(country.lastStage, Math.max(country.firstStage, cleared + 1)) - 1];
  return { country, selected, current, cleared, complete: cleared >= campaignStages.length };
}

function stageNumber(stage) {
  return `${COUNTRIES.find(country => country.id === stage.countryId).index + 1}-${String(stage.region).padStart(2, '0')}`;
}

function countryTabs(state, selectedCountry) {
  return COUNTRIES.map(country => {
    const progress = countryProgress(state, country.id);
    const status = progress.complete ? '점령 완료' : progress.unlocked ? `${progress.cleared} / 20` : '잠금';
    const reason = progress.unlocked ? '' : ` · ${COUNTRIES[country.index - 1].name} 점령 필요`;
    return `<button data-country="${country.id}" class="nation-tab ${selectedCountry.id === country.id ? 'active' : ''}" ${progress.unlocked ? '' : 'disabled'} aria-pressed="${selectedCountry.id === country.id}" aria-label="${country.index + 1}. ${country.name} · ${status}${reason}"><b>${country.index + 1}. ${country.name.split(' ')[0]}</b><small>${progress.complete ? '✓ ' : progress.unlocked ? '' : '🔒 '}${status}</small></button>`;
  }).join('');
}

function stageRow(state, stage, selectedId) {
  const cleared = state.campaignCleared ?? 0;
  const done = stage.id <= cleared, next = stage.id === cleared + 1, locked = !done && !next;
  const stars = Math.max(0, Math.min(3, state.campaignStars?.[stage.id - 1] ?? 0));
  const access = battleAccess(state).unlocked;
  const status = done ? '점령 완료' : next ? access ? '도전 가능' : '중령부터 출전' : '잠금';
  const statusClass = done ? 'cleared' : next ? 'current' : 'locked';
  return `<li><button class="campaign-stage ${statusClass}${stage.id === selectedId ? ' selected' : ''}${stage.capital ? ' capital' : ''}" data-region="${stage.id}" ${locked ? 'disabled' : ''} aria-pressed="${stage.id === selectedId}" aria-label="${stageNumber(stage)} ${stage.name} · ${status}${done ? ` · 별 ${stars}개` : locked ? ' · 이전 지역 점령 필요' : ''} · 권장 전력 ${fmt(stage.recommendedPower)}">
    <span class="stage-number">${stageNumber(stage)}</span><span class="stage-copy"><b>${stage.name}${stage.capital ? '<em>수도전</em>' : ''}</b><small>권장 전력 ${fmt(stage.recommendedPower)}</small></span>
    <span class="stage-state"><strong>${done ? '✓ ' : locked ? '🔒 ' : ''}${status}</strong>${done ? `<span class="best-stars" aria-hidden="true">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</span>` : '<span aria-hidden="true">' + (next ? access ? '출전 준비 →' : '진급 후 출전' : '이전 지역 점령') + '</span>'}</span></button></li>`;
}

export function campaignMarkup(state, countryId = null, selectedId = null, deckIds = null) {
  const { country, selected, current, cleared, complete } = campaignSelection(state, countryId, selectedId);
  const progress = countryProgress(state, country.id);
  return `<header class="battle-header"><div><small>${CONTINENT.name} 대륙 정복</small><h2 id="battle-title">스테이지 선택</h2></div><button data-battle-close aria-label="전투 메뉴 닫기">×</button></header>
    <div class="campaign-progress"><b>${cleared} / ${campaignStages.length} 지역 점령</b><span>초당 수입 +${campaignBonusPercent(state)}%</span><progress value="${cleared}" max="${campaignStages.length}" aria-label="전체 점령 진행도"></progress></div>
    <nav class="nation-tabs" aria-label="국가 선택">${countryTabs(state, country)}</nav>
    ${complete ? '<p class="campaign-complete" role="status">✓ 모든 지역 점령 완료 · 지역을 골라 별 기록에 도전하세요.</p>' : `<button class="campaign-next" data-current-stage aria-label="다음 목표 ${stageNumber(current)} ${current.name} 출전 준비"><span>다음 목표 <b>${stageNumber(current)} ${current.name}</b></span><strong>${selected.id === current.id ? '선택 중' : '바로 가기 →'}</strong></button>`}
    <div class="stage-list-heading"><h3>${country.name}</h3><span>${progress.cleared} / ${CONTINENT.regionsPerCountry} 점령</span></div>
    <ol class="campaign-stage-list" aria-label="${country.name}의 스테이지" tabindex="0">${campaignStages.filter(stage => stage.countryId === country.id).map(stage => stageRow(state, stage, selected.id)).join('')}</ol>
    ${stageBriefMarkup(state, selected, deckIds ?? [])}<p class="battle-session-note" data-battle-session></p>`;
}

// 클릭 시에만 목록을 다시 만들고, 스크롤/키보드는 브라우저 기본 동작을 사용한다.
export function createCampaignList(dialog, getState, getDeck = () => []) {
  let countryId = null, selectedId = null;
  function render({ preserveScroll = false, focusSelection = false } = {}) {
    const previousTop = dialog.querySelector('.campaign-stage-list')?.scrollTop ?? 0;
    const selection = campaignSelection(getState(), countryId, selectedId);
    countryId = selection.country.id; selectedId = selection.selected.id;
    dialog.innerHTML = campaignMarkup(getState(), countryId, selectedId, getDeck(selectedId));
    dialog.classList.add('in-campaign'); dialog.classList.remove('in-battle');
    const list = dialog.querySelector('.campaign-stage-list');
    const button = dialog.querySelector(`[data-region="${selectedId}"]`);
    if (preserveScroll) list.scrollTop = previousTop;
    else if (button) list.scrollTop = Math.max(0, button.offsetTop - (list.clientHeight - button.offsetHeight) / 2);
    if (focusSelection) button?.focus({ preventScroll: true });
  }
  function show(id = null) { countryId = id; selectedId = null; render(); }
  function handle(target) {
    if (target.hasAttribute('data-country')) {
      const country = COUNTRIES.find(item => item.id === target.dataset.country);
      if (!country || !countryProgress(getState(), country.id).unlocked) return true;
      show(country.id); dialog.querySelector(`[data-country="${country.id}"]`)?.focus({ preventScroll: true }); return true;
    }
    if (target.hasAttribute('data-current-stage')) {
      const current = campaignSelection(getState()).current;
      countryId = current.countryId; selectedId = current.id; render({ focusSelection: true }); return true;
    }
    if (target.hasAttribute('data-region')) {
      const id = Number(target.dataset.region);
      if (!campaignStages.some(stage => stage.id === id && stage.countryId === countryId) || id > (getState().campaignCleared ?? 0) + 1) return true;
      selectedId = id; render({ preserveScroll: true, focusSelection: true }); return true;
    }
    return false;
  }
  return { show, handle, get countryId() { return countryId; } };
}
