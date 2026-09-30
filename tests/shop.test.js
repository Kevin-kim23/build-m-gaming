import test from "node:test";
import assert from "node:assert/strict";
import { freshState } from "../src/game.js";
import { shopMarkup, SHOP_CATEGORIES } from "../src/shop.js";
import { COMMAND_BATON } from "../src/personal-equipment.js";

const state = (power, sergeants = 40) => ({
  ...freshState(1_800_000_000_000), soldiers: power - sergeants * 10, sergeants,
});
const markup = (s, category) => shopMarkup(s, "", () => "", category);

test("shop shows just the selected category and shares one wallet, title and live message", () => {
  const s = state(1280);
  for (const { id } of SHOP_CATEGORIES) {
    const html = markup(s, id);
    assert.equal((html.match(/aria-pressed="true"/g) ?? []).length, 1);
    assert.match(html, new RegExp(`data-shop-category="${id}" aria-pressed="true"`));
    for (const elementId of ["shop-gold", "modal-title", "shop-message", "close-shop"])
      assert.equal((html.match(new RegExp(`id="${elementId}"`, "g")) ?? []).length, 1);
    assert.equal(html.includes('data-unit="soldier"'), id === "recruit");
    assert.equal(html.includes('data-buy-equipment="artillery"'), id === "equipment");
    assert.equal(html.includes('data-personal-equipment='), id === "personal");
    assert.equal(html.includes('class="formation-guide"'), id === "recruit");
    assert.equal(html.includes('class="rank-steps"'), id === "recruit");
  }
  assert.match(markup(s), /data-shop-content="recruit"/);
  assert.doesNotMatch(markup(s, "recruit"), /<details[^>]*\sopen(?:\s|>)/);
});

test("personal equipment stays unnamed before major, previews locked at major and is owned at lieutenant colonel", () => {
  const early = markup(state(320, 0), "personal");
  assert.doesNotMatch(early, new RegExp(COMMAND_BATON.name));
  assert.doesNotMatch(early, /command-baton-art|data-personal-equipment/);
  const locked = markup(state(640), "personal");
  assert.match(locked, /personal-item locked/);
  assert.match(locked, /중령 진급 시 자동 지급/);
  assert.doesNotMatch(locked, /class="personal-recruit-link"/);
  const owned = markup(state(1280), "personal");
  assert.match(owned, /보유 중 · 중령 진급 보상/);
  assert.match(owned, /Lv\.1/);
  assert.match(owned, /class="personal-recruit-link" data-shop-category="recruit"/);
  assert.match(owned, /골드는 별도로 지불/);
  assert.doesNotMatch(owned, /data-buy=|data-buy-equipment=|data-buy-bulk=|data-enhance/);
});

test("baton adds exactly one 100-soldier action without replacing one-unit recruitment", () => {
  assert.doesNotMatch(markup(state(640), "recruit"), /data-buy-bulk|data-bulk-price/);
  // Power cannot bypass the forty-sergeant promotion condition.
  assert.doesNotMatch(markup(state(1280, 39), "recruit"), /data-buy-bulk/);
  const html = markup(state(1280), "recruit");
  assert.equal((html.match(/data-buy-bulk="soldier"/g) ?? []).length, 1);
  assert.equal((html.match(/data-bulk-price/g) ?? []).length, 1);
  assert.equal((html.match(/data-bulk-label/g) ?? []).length, 1);
  assert.match(html, /일반병 100명 모집/);
  for (const id of ["soldier", "sergeant", "staffSergeant"])
    assert.match(html, new RegExp(`data-buy="${id}"`));
  assert.doesNotMatch(html, /data-buy-bulk="(?:sergeant|staffSergeant)"/);
});

test("unrevealed equipment remains absent and invalid category IDs safely fall back to recruitment", () => {
  const s = state(0, 0), empty = markup(s, "equipment");
  assert.match(empty, /진급하면 새로운 장비가 공개됩니다/);
  assert.doesNotMatch(empty, /견인포|전차|자주포|data-buy-equipment/);
  for (const value of ["unknown", "<script>alert(1)</script>", null, 42]) {
    const html = markup(s, value);
    assert.match(html, /data-shop-content="recruit"/);
    assert.doesNotMatch(html, /<script>/);
    const nav = html.match(/<nav class="shop-categories"[^>]*>(.*?)<\/nav>/s)[1];
    const ids = [...nav.matchAll(/\sdata-shop-category="([^"]+)"/g)].map((m) => m[1]);
    assert.deepEqual(ids, SHOP_CATEGORIES.map((item) => item.id));
  }
});
