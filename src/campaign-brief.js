import { COUNTRIES, CONTINENT, countryProgress } from './campaign.js';
import {regionIncomePercent} from './campaign-rewards.js';
import { fmt } from './format.js';
import { battleIcon } from './battle-icons.js';

export function countryBriefMarkup() {
  return `<section class="country-brief" aria-label="현재 지도에 보이는 국가">
    <div><h3 data-country-title></h3><p data-country-detail></p><p class="country-status"><span data-country-lock hidden>${battleIcon('lock')}</span><span data-country-status></span></p></div>
    <button class="battle-primary" data-country-entry>국가 지도 ${battleIcon('right')}</button>
  </section>`;
}
export function updateCountryBrief(root, state, country) {
  const section = root.querySelector('.country-brief');
  if (!section) return;
  const progress = countryProgress(state, country.id);
  const set = (selector, value) => { const node=section.querySelector(selector);if(node.textContent!==value)node.textContent=value; };
  set('[data-country-title]',country.name);
  set('[data-country-detail]',`${CONTINENT.regionsPerCountry}개 지역 · 수도 권장 전력 ${fmt(country.powers.at(-1))} · 지역당 수입 +${regionIncomePercent(country.firstStage)}%`);
  set('[data-country-status]',progress.unlocked?`${country.terrain} · ${progress.cleared}/${CONTINENT.regionsPerCountry} 점령`:`잠금 · ${COUNTRIES[country.index-1].name} 점령 후 해금`);
  const lock=section.querySelector('[data-country-lock]');
  if(lock) lock.hidden=progress.unlocked;
  const button=section.querySelector('[data-country-entry]');
  button.dataset.country=country.id;button.disabled=!progress.unlocked;
  button.setAttribute('aria-label',country.name+' 국가 지도 열기');
}
