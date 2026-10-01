import { personalIcon } from './personal-art.js';
import { RANK_DEFINITIONS } from "./ranks.js";
import { medalShelfMarkup } from "./achievement-markup.js";
export const coin =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h10l5 5v10l-5 5H7l-5-5V7z" fill="#d9b55d"/><path d="M8 5h8l3 3v8l-3 3H8l-3-3V8z" fill="#e8cd84"/><path d="M14 8h-4v8h4v-4h-2" fill="none" stroke="#8a6932" stroke-width="2"/></svg>';
const speaker =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M3 9h4l5-4v14l-5-4H3z"/><path class="sound-waves" d="M16 8q4 4 0 8m3-11q7 7 0 14"/><path class="sound-off" d="m16 9 5 6m0-6-5 6"/></svg>';
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
    <button id="sound" aria-label="효과음" role="switch" aria-checked="${state.sound}">${speaker}</button>
    </header>`;
}

function goldMarkup() {
  return `<div class="gold-counter">
    <span class="gold-label">보유 골드</span>
    <div>${coin}<strong id="gold">
    </strong>
    <span class="gold-unit">G</span>
    </div>
    <p class="income-line">
    <span>초당 <b id="passive-rate">
    </b><small id="campaign-income-bonus" hidden></small>
    </span>
    <span>터치 <b id="tap-rate">
    </b>
    </span>
    </p>
    </div>`;
}

function fieldMarkup() {
  return `<button id="tap-zone" aria-label="화면 터치해서 골드 획득">
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
    </button>`;
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
    <span>작은 시작, 위대한 부대.</span>
    </footer>`;
}

function fieldToolsMarkup() {
  return '<section class="field-tools" aria-label="장군 장비와 연병장 배경" hidden>' +
    '<div class="home-skills" role="group" aria-label="장군 스킬"><button class="home-skill home-sword" data-use-sword hidden><span class="sword-clock">' +
    '<svg class="sword-clock-ring" viewBox="0 0 48 48" aria-hidden="true" focusable="false" hidden><circle class="sword-clock-track" cx="24" cy="24" r="21"/><circle data-sword-ring cx="24" cy="24" r="21" pathLength="100" stroke-dasharray="100 100" transform="rotate(-90 24 24)"/></svg>' +
    '<span data-sword-art>' + personalIcon('sword') + '</span><span data-sword-time hidden></span></span>' +
    '<span data-sword-label>장군검 사용</span></button>' +
    '<button class="home-skill home-revolver" data-use-revolver hidden><span class="sword-clock revolver-clock">' +
    '<svg class="sword-clock-ring" viewBox="0 0 48 48" aria-hidden="true" focusable="false" hidden><circle class="sword-clock-track" cx="24" cy="24" r="21"/><circle data-revolver-ring cx="24" cy="24" r="21" pathLength="100" stroke-dasharray="100 100" transform="rotate(-90 24 24)"/></svg>' +
    '<span class="revolver-mini-art">' + personalIcon('revolver') + '</span><span data-revolver-time hidden></span></span><span data-revolver-label>리볼버 사용</span></button></div>' +
    '<div class="field-theme-picker"><span class="sr-only">연병장 배경</span><div role="group" aria-label="연병장 배경"><button data-field-theme="earth" aria-pressed="true">흙</button><button data-field-theme="concrete" aria-pressed="false" aria-label="회색 시멘트">시멘트</button></div></div></section>';
}
export function homeMarkup(state) {
  return `<main class="game">${headerMarkup(state)}${medalShelfMarkup()}${fieldMarkup()}${dockMarkup()}${footerMarkup()}</main>`;
}

export function insignia(index) {
  const r = RANK_DEFINITIONS[index];
  return (
    '<span class="insignia ' +
    r.kind +
    '">' +
    "<i></i>".repeat(r.marks) +
    "</span>"
  );
}
