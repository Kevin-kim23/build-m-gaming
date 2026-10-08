import { personalIcon } from './personal-art.js';
import { generalRankBadge, marshalRankBadge } from './rank-frame.js';
import { RANK_DEFINITIONS } from "./ranks.js";
import { APP_VERSION } from "./version.js";
import { medalShelfMarkup } from "./achievement-markup.js";
export const coin =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h10l5 5v10l-5 5H7l-5-5V7z" fill="#d9b55d"/><path d="M8 5h8l3 3v8l-3 3H8l-3-3V8z" fill="#e8cd84"/><path d="M14 8h-4v8h4v-4h-2" fill="none" stroke="#8a6932" stroke-width="2"/></svg>';
const shopIcon =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m4 4-2 5v3h20V9l-2-5zM4 12v9h16v-9M9 21v-6h6v6M8 4 7 12m9-8 1 8"/></svg>';

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
  return `<div class="income-lines" aria-label="골드 수입과 증가 효과" title="표시된 골드에 효과가 이미 포함되어 있습니다. 시설·점령·개인장비는 순차 적용되며, 장비 수입 효과는 배치한 군사 장비에만 적용됩니다.">
    <div class="income-line"><span class="income-rate">초당 <b id="passive-rate"></b></span><small id="passive-effects" class="income-effects" hidden></small><small id="passive-potion-effect" class="income-skill" hidden></small></div>
    <div class="income-line"><span class="income-rate">터치 <b id="tap-rate"></b></span><small id="tap-effects" class="income-effects" hidden></small><small id="tap-sword-effect" class="income-skill" hidden></small><small id="tap-potion-effect" class="income-skill" hidden></small></div>
    </div>`;
}

function fieldMarkup() {
  return `<section class="field-region" aria-label="상하좌우로 둘러보는 연병장"><div id="field-viewport"><button id="tap-zone" aria-label="화면 터치해서 골드 획득">
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
    </button></div><span id="field-scroll-hint" class="field-scroll-hint" hidden>↔ 좌우로 밀어서 둘러보기</span></section>`;
}

function dockMarkup() {
  return `<section class="home-dock" aria-label="내 부대">
    <div class="coach" id="coach" role="status" aria-live="polite" hidden><p id="coach-text"></p><button type="button" id="coach-off" aria-label="안내 끄기">끄기</button></div>
    ${fieldToolsMarkup()}
    <div class="promotion-line">
    <span id="next-rank">
    </span>
    <b id="rank-progress">
    </b>
    </div>
    <div class="promotion-track">
    <i id="promotion-fill">
    </i>
    </div>
    <nav class="home-tabs" aria-label="부대 메뉴">
    <button id="open-shop">${shopIcon}<span>상점</span>
    <i id="shop-dot" hidden>
    </i>
    </button>
    <button id="open-equipment">
    <span aria-hidden="true">⚙</span>
    <span>장비</span>
    </button>
    <button id="open-battle" hidden><span aria-hidden="true">⚔</span><span>전투</span><small id="battle-lock-label"></small></button>
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
  return '<section class="field-tools" aria-label="장군 장비" hidden>' +
    '<div class="home-skills" role="group" aria-label="장군 스킬"><button class="home-skill home-sword" data-use-sword hidden><span class="sword-clock">' +
    '<svg class="sword-clock-ring" viewBox="0 0 48 48" aria-hidden="true" focusable="false" hidden><circle class="sword-clock-track" cx="24" cy="24" r="21"/><circle data-sword-ring cx="24" cy="24" r="21" pathLength="100" stroke-dasharray="100 100" transform="rotate(-90 24 24)"/></svg>' +
    '<span data-sword-art>' + personalIcon('sword') + '</span><span data-sword-time hidden></span></span>' +
    '<span data-sword-label>장군검 사용</span></button>' +
    '<button class="home-skill home-revolver" data-use-revolver hidden><span class="sword-clock revolver-clock">' +
    '<svg class="sword-clock-ring" viewBox="0 0 48 48" aria-hidden="true" focusable="false" hidden><circle class="sword-clock-track" cx="24" cy="24" r="21"/><circle data-revolver-ring cx="24" cy="24" r="21" pathLength="100" stroke-dasharray="100 100" transform="rotate(-90 24 24)"/></svg>' +
    '<span class="revolver-mini-art">' + personalIcon('revolver') + '</span><span data-revolver-time hidden></span></span><span data-revolver-label>리볼버 사용</span></button></div>' +
    '</section>';
}
export function homeMarkup(state) {
  return `<main class="game">${headerMarkup(state)}<aside id="save-notice" class="save-notice" role="status" hidden><strong data-save-notice-title></strong><button type="button" id="review-save">저장 확인</button></aside>${medalShelfMarkup()}${fieldMarkup()}${dockMarkup()}${footerMarkup()}</main>`;
}

export function insignia(index) {
  const r = RANK_DEFINITIONS[index];
  if (r.kind === 'general' && r.marks <= 5)
    return `<span class="insignia general framed-rank">${generalRankBadge(r.marks)}</span>`;
  if (r.kind === 'general' && r.marks >= 6)
    return `<span class="insignia general framed-rank">${marshalRankBadge(r.marks)}</span>`;
  return (
    '<span class="insignia ' +
    r.kind +
    '">' +
    "<i></i>".repeat(r.marks) +
    "</span>"
  );
}
