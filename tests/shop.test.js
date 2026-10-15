import { personalMarkup, personalDetailMarkup } from "../src/personal-panels.js";
import test from "node:test";
import assert from "node:assert/strict";
import { freshState } from "../src/game.js";
import { shopMarkup, SHOP_CATEGORIES } from "../src/shop.js";
import { COMMAND_BATON } from "../src/personal-equipment.js";

const state = (power, sergeants = 40) => ({
  ...freshState(1_800_000_000_000), soldiers: power - sergeants * 10, sergeants,
});
const markup = (s, category) => category === "personal" ? personalMarkup(s) : shopMarkup(s, "", () => "", category);

test("each shop destination has its own title and content without cross-category tabs", () => {
  const s = state(1280);
  for (const { id, name } of SHOP_CATEGORIES) {
    const html = markup(s, id);
    assert.match(html, new RegExp(`<h2 id="modal-title">${name}</h2>`));
    assert.doesNotMatch(html, /data-shop-category|data-panel=|shop-categories/);
    assert.equal(html.includes("data-school="), id === "recruit");
    assert.equal(html.includes("data-facility-action="), id === "facilities");
    assert.equal(html.includes("data-potion-ad="), id === "items");
    for (const elementId of ["modal-title", "shop-message", "close-shop"])
      assert.equal((html.match(new RegExp(`id="${elementId}"`, "g")) ?? []).length, 1);
    assert.equal(html.includes('data-unit="soldier"'), id === "recruit");
    assert.equal(html.includes('data-buy-equipment="artillery"'), id === "equipment");
    assert.equal(html.includes('data-personal-equipment='), id === "personal");
    // Rank and formation guides moved to the rank badge popup.
    assert.doesNotMatch(html, /formation-guide|rank-steps/);
  }
  assert.match(markup(s), /data-shop-content="recruit"/);
  assert.doesNotMatch(markup(s, "recruit"), /<details[^>]*\sopen(?:\s|>)/);
});

test("cash store omits the gold wallet while gold-spending screens retain it", () => {
  const s = state(1280);
  const store = shopMarkup(s, '<span data-test-coin></span>', () => '', 'store');
  assert.doesNotMatch(store, /shop-wallet|shop-gold|보유 골드|data-test-coin/);
  for (const category of ['recruit', 'facilities', 'items']) {
    const html = shopMarkup(s, '<span data-test-coin></span>', () => '', category);
    assert.equal((html.match(/class="shop-wallet"/g) ?? []).length, 1);
    assert.equal((html.match(/id="shop-gold"/g) ?? []).length, 1);
    assert.match(html, /보유 골드/);
    assert.match(html, /data-test-coin/);
  }
});

test("personal equipment is visible early and owned only at its award rank", () => {
  const early = markup(state(320, 0), "personal");
  assert.match(early, new RegExp(COMMAND_BATON.name));
  assert.match(early, /personal-item locked/);
  const locked = markup(state(640), "personal");
  assert.match(locked, /personal-item locked/);
  assert.match(locked, /중령 진급 시 자동 지급/);
  assert.doesNotMatch(locked, /class="personal-recruit-link"/);
  const owned = markup(state(1280), "personal");
  assert.match(owned, /보유 중 · 중령 진급 보상/);
  assert.match(owned, /Lv\.1/);
  assert.doesNotMatch(owned, /class="personal-recruit-link" data-shop-category="recruit"/);
  assert.match(personalDetailMarkup(state(1280), "commandBaton").body, /골드는 별도로 지불/);
  assert.doesNotMatch(owned, /data-buy=|data-buy-equipment=|data-buy-bulk=/);
  assert.match(owned,/data-enhance-personal="commandBaton"/);
});

test("baton adds four enlisted batch actions without replacing individual recruitment", () => {
  assert.doesNotMatch(markup(state(640), "recruit"), /data-buy-bulk|data-bulk-price/);
  // Only power is required; a missing sergeant no longer suppresses the baton.
  assert.match(markup(state(1280, 39), "recruit"), /data-buy-bulk/);
  const html = markup(state(1280), "recruit");
  assert.equal((html.match(/data-buy-bulk="soldier"/g) ?? []).length, 1);
  assert.equal((html.match(/data-bulk-price/g) ?? []).length, 4);
  assert.match(html, /일반병 100명 모집/);
  for (const id of ["soldier", "sergeant", "staffSergeant"])
    assert.match(html, new RegExp(`data-buy="${id}"`));
  assert.doesNotMatch(html, /data-buy-bulk="(?:sergeant|staffSergeant)"/);
});

test("unrevealed equipment remains absent and invalid category IDs safely fall back to recruitment", () => {
  const s = state(0, 0), empty = markup(s, "equipment");
  assert.match(empty, /data-shop-content="recruit"/);
  assert.doesNotMatch(empty, /견인포|전차|자주포|data-buy-equipment/);
  for (const value of ["unknown", "<script>alert(1)</script>", null, 42]) {
    const html = markup(s, value);
    assert.match(html, /data-shop-content="recruit"/);
    assert.doesNotMatch(html, /<script>/);
    assert.doesNotMatch(html, /data-shop-category|shop-categories/);
  }
});


test("paid offers live in the store while potion use and ads stay in items",()=>{
  const html=markup(state(1280),"store");
  assert.match(html,/<h2 id="modal-title">상점<\/h2>/);
  assert.match(html,/data-buy-starter/);assert.match(html,/data-buy-home-auto/);
  assert.doesNotMatch(html,/예정 가격|5,900/);assert.match(html,/disabled>구매 준비 중/);assert.match(html,/자동터치 미포함/);
  assert.doesNotMatch(html,/data-upgrade|data-school=|data-facility|data-potion-ad|data-potion-use|data-unit=/);
  const items=markup(state(1280),'items');
  assert.doesNotMatch(items,/data-home-auto-tap|data-buy-starter/);
  assert.match(items,/data-potion-ad="red"/);assert.match(items,/data-potion-use="blue"/);
});
