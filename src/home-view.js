import { UNIT_LIST } from "./units.js";
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
    </b>
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
    <div class="roster">
    <div class="roster-units">
    ${UNIT_LIST.map(u=>`<div class="owned-unit" data-roster="${u.id}" ${u.id==='soldier'?'':'hidden'}>
      <canvas data-home-unit="${u.id}" width="36" height="46" role="img" aria-label="${u.name}"></canvas>
      <div><span>${u.name}</span><strong><b data-home-count="${u.id}">0</b><small>명</small></strong></div>
    </div>`).join('')}
    </div>
    </div>
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
