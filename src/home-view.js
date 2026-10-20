import { homeMenuIcon } from './home-menu-icons.js';
import { lootIcon } from './operative-art.js';
import { personalIcon } from './personal-art.js';
import { generalRankBadge, marshalRankBadge, galacticRankBadge, rankBadgeInstance } from './rank-frame.js';
import { RANK_DEFINITIONS } from "./ranks.js";
import { APP_VERSION } from "./version.js";
import { homeItemsMarkup } from "./home-quick-items.js";
export const coin =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h10l5 5v10l-5 5H7l-5-5V7z" fill="#d9b55d"/><path d="M8 5h8l3 3v8l-3 3H8l-3-3V8z" fill="#e8cd84"/><path d="M14 8h-4v8h4v-4h-2" fill="none" stroke="#8a6932" stroke-width="2"/></svg>';

export function promotionTone(percent) {
  if (percent >= 80) return 'red';
  if (percent >= 60) return 'orange';
  if (percent >= 40) return 'green';
  return 'blue';
}

function headerMarkup(state) {
  return `<header class="hud">
    <div class="rank">
    <button type="button" id="open-ranks" class="rank-open" aria-label="계급과 편제 안내 열기"></button>
    <span class="rank-mark" aria-hidden="true">
    </span>
    <div>
    <small>부대 키우기</small>
    <h1 id="rank-name">
    </h1>
    </div>
    </div>
    ${goldMarkup()}
    <button id="sound" aria-label="설정" title="설정"><span aria-hidden="true" style="font-size:24px">⚙</span></button>
    ${incomeMarkup()}
    <div class="hud-promotion" aria-label="진급 진행">    <div class="promotion-line">
    <span id="next-rank">
    </span>
    <b id="rank-progress">
    </b>
    </div>
    <div class="promotion-track" role="progressbar" aria-label="다음 계급 필요 전력 달성률" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
    <i id="promotion-fill">
    </i><span id="promotion-percent">0%</span>
    </div>
</div>
    </header>`;
}

function goldMarkup() {
  return `<div class="gold-counter">
    <span class="gold-label">보유 골드</span>
    <div>${coin}<strong id="gold">
    </strong>
    <span class="gold-unit">G</span>
    </div>
    </div>`;
}

function incomeMarkup() {
  return `<div class="income-lines" aria-label="골드 수입과 증가 효과">
    <div class="income-line"><span class="income-rate">초당 수입 <b id="passive-rate"></b></span></div>
    <div class="income-line"><span class="income-rate">터치 수입 <b id="tap-rate"></b></span></div>
    <details class="income-details"><summary aria-label="수입 효과 자세히">ⓘ</summary>
      <div class="income-detail-body"><strong>수입에 포함된 효과</strong>
        <div><b>초당</b><small id="passive-effects" class="income-effects" hidden></small><small id="passive-potion-effect" class="income-skill" hidden></small></div>
        <div><b>터치</b><small id="tap-effects" class="income-effects" hidden></small><small id="tap-sword-effect" class="income-skill" hidden></small><small id="tap-potion-effect" class="income-skill" hidden></small></div>
        <p>표시 수입에는 효과가 이미 포함돼요. 시설·점령·개인장비는 순차 적용되며, 군사 장비 효과는 배치한 장비에만 적용돼요.</p>
      </div>
    </details>
    </div>`;
}

function fieldMarkup() {
  return `<section class="field-region" aria-label="내 부대 연병장"><div id="field-viewport"><button id="tap-zone" aria-label="화면 터치해서 골드 획득">
    <canvas id="field" aria-hidden="true">
    </canvas>
    <span id="field-labels" aria-hidden="true"></span>
    <span class="formation-summary" id="formation-summary">
    </span>
    <span class="intro-copy">아직은, 빈 터.<small>골드를 모아 첫 병사를 맞이하세요.</small>
    </span>
    <span class="tap-hint">
    <b>화면을 터치하세요</b>
    <small id="tap-hint-rate">
    </small>
    </span>
    <span class="pixel-corner top-left">
    </span>
    <span class="pixel-corner top-right">
    </span>
    <span class="pixel-corner bottom-left">
    </span>
    <span class="pixel-corner bottom-right">
    </span>
    </button></div>${fieldToolsMarkup()}<span id="home-auto-feedback" aria-hidden="true"></span><span id="revolver-feedback" aria-hidden="true"></span><span id="field-scroll-hint" class="field-scroll-hint" hidden>↔ 좌우로 밀어서 둘러보기</span></section>`;
}

// 무한 방어전 버튼 그림: 방패 위 별(자체 제작 도형).
const defenseIcon = () => '<svg viewBox="0 0 32 32" width="30" height="30"><path d="M16 3 27 7v8c0 7-5 12-11 14C10 27 5 22 5 15V7Z" fill="#41606a" stroke="#c9dde2" stroke-width="1.6"/><path d="M16 9.5l1.9 4 4.4.5-3.3 3 .9 4.3-3.9-2.2-3.9 2.2.9-4.3-3.3-3 4.4-.5Z" fill="#e6c27a"/></svg>';
function dockMarkup() {
  return `<section class="home-dock" aria-label="내 부대">
    <div class="coach" id="coach" role="status" aria-live="polite" hidden><p id="coach-text"></p><button type="button" id="coach-off" aria-label="안내 끄기">끄기</button></div>
    <div class="home-expeditions">
      <button id="open-loot" class="home-battle"><span class="home-menu-icon">${lootIcon()}</span><span class="home-expedition-label">전리품 상점</span></button>
      <button id="open-defense" class="home-battle" hidden><span class="home-menu-icon" aria-hidden="true">${defenseIcon()}</span><span class="home-expedition-label">무한 방어전<small id="defense-home-label"></small></span></button>
      <button id="open-battle" class="home-battle" hidden>${homeMenuIcon('battle')}<span class="home-expedition-label">전투<small id="battle-lock-label"></small></span></button>
    </div>
    <nav class="home-tabs" aria-label="부대 메뉴">
    <button id="open-recruit">${homeMenuIcon('recruit')}<span>군대 모집</span></button>
    <button id="open-equipment">${homeMenuIcon('equipment')}<span>군사 장비</span></button>
    <button id="open-shop">${homeMenuIcon('shop')}<span>상점</span></button>
    <button id="open-facilities">${homeMenuIcon('facilities')}<span>시설</span></button>
    <button id="open-personal">${homeMenuIcon('personal')}<span>개인 장비</span></button>
    <button id="open-items">${homeMenuIcon('items')}<span>아이템</span></button>
    </nav>
    </section>`;
}

function footerMarkup() {
  return `<footer>
    <span id="save-status">
    <i>
    </i> 저장 확인 중</span>
    <span class="footer-info">v${APP_VERSION}</span>
    </footer>`;
}

function fieldToolsMarkup() {
  return '<section class="field-tools" aria-label="사용 아이템">' +
    '<div class="home-skills" role="group" aria-label="사용 아이템">' + homeItemsMarkup() + '<button class="home-skill home-sword" data-use-sword hidden><span class="sword-clock">' +
    '<svg class="sword-clock-ring" viewBox="0 0 48 48" aria-hidden="true" focusable="false" hidden><circle class="sword-clock-track" cx="24" cy="24" r="21"/><circle data-sword-ring cx="24" cy="24" r="21" pathLength="100" stroke-dasharray="100 100" transform="rotate(-90 24 24)"/></svg>' +
    '<span data-sword-art>' + personalIcon('sword') + '</span><span data-sword-time hidden></span></span>' +
    '<span data-sword-label>장군검</span></button>' +
    '<button class="home-skill home-revolver" data-use-revolver hidden><span class="sword-clock revolver-clock">' +
    '<svg class="sword-clock-ring" viewBox="0 0 48 48" aria-hidden="true" focusable="false" hidden><circle class="sword-clock-track" cx="24" cy="24" r="21"/><circle data-revolver-ring cx="24" cy="24" r="21" pathLength="100" stroke-dasharray="100 100" transform="rotate(-90 24 24)"/></svg>' +
    '<span class="revolver-mini-art">' + personalIcon('revolver') + '</span><span data-revolver-time hidden></span></span><span data-revolver-label>리볼버</span></button></div>' +
    '</section>';
}
export function homeMarkup(state) {
  return `<main class="game">${headerMarkup(state)}<aside id="save-notice" class="save-notice" role="status" hidden><strong data-save-notice-title></strong><button type="button" id="review-save">저장 확인</button></aside>${fieldMarkup()}${dockMarkup()}${footerMarkup()}</main>`;
}

export function insignia(index) {
  const r = RANK_DEFINITIONS[index];
  if (r.kind === 'general' && r.marks <= 5)
    return `<span class="insignia general framed-rank">${rankBadgeInstance(generalRankBadge(r.marks))}</span>`;
  if (r.kind === 'general' && r.marks >= 11)
    return `<span class="insignia general framed-rank">${rankBadgeInstance(galacticRankBadge(r.marks))}</span>`;
  if (r.kind === 'general' && r.marks >= 6)
    return `<span class="insignia general framed-rank">${rankBadgeInstance(marshalRankBadge(r.marks))}</span>`;
  if (r.topStar)
    return `<span class="insignia ${r.kind} top-star"><b class="insignia-top-star"></b>${"<i></i>".repeat(r.chevrons)}</span>`;
  return (
    '<span class="insignia ' +
    r.kind +
    '">' +
    "<i></i>".repeat(r.marks) +
    "</span>"
  );
}
