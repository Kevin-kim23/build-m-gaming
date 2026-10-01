import { test } from "node:test";
import assert from "node:assert/strict";
import { promotionProfile } from "../src/promotion.js";
import { createGameAudio } from "../src/audio.js";
import { LAST_RANK } from "../src/ranks.js";

test("higher ranks retain bounded fanfares and give generals a longer dedicated ceremony", () => {
  let previous = promotionProfile(1);
  for (let rank = 1; rank <= LAST_RANK; rank++) {
    const current = promotionProfile(rank);
    assert.equal(current.duration, current.generalTier ? 5000 + current.generalTier * 300 + Math.max(0,current.generalTier-4)*500 : 3000);
    assert.ok(current.volume < 0.15);
    assert.ok(current.width <= 360);
    if (rank > 1) {
      assert.ok(current.width >= previous.width);
      assert.ok(current.volume >= previous.volume);
      assert.ok(current.sparks > previous.sparks);
    }
    previous = current;
  }
});

function audioFixture() {
  const oscillators = [],
    gains = [];
  const param = () => ({
    peaks: [],
    values: [],
    setValueAtTime(value) { this.values.push(value); },
    exponentialRampToValueAtTime(value) {
      this.peaks.push(value);
    },
  });
  const context = {
    currentTime: 12,
    destination: {},
    resume: () => Promise.resolve(),
    createOscillator() {
      const o = {
        frequency: param(),
        connect() {},
        disconnect() {
          this.disconnected = true;
        },
        start(time) {
          this.starts = time;
        },
        stop(time) {
          this.stops = time ?? 0;
        },
      };
      oscillators.push(o);
      return o;
    },
    createGain() {
      const gain = {
        gain: param(),
        connect() {},
        disconnect() {
          this.disconnected = true;
        },
      };
      gains.push(gain);
      return gain;
    },
  };
  let created = 0;
  const audio = createGameAudio(() => {
    created++;
    return context;
  });
  return { audio, oscillators, gains, created: () => created };
}
test("muted sound never creates audio and repeated sounds reuse one context", () => {
  const f = audioFixture();
  f.audio.promotion(12, false);
  f.audio.tap(false);
  assert.equal(f.created(), 0);
  f.audio.tap(true);
  f.audio.recruit(true);
  assert.equal(f.created(), 1);
  assert.ok(f.oscillators.every((o) => o.stops > o.starts));
  for (const o of f.oscillators) o.onended();
  assert.ok(f.oscillators.every((o) => o.disconnected));
  assert.ok(f.gains.every((g) => g.disconnected));
});
test("a new fanfare cancels earlier voices and higher ranks produce greater gain", () => {
  const low = audioFixture(),
    high = audioFixture();
  low.audio.promotion(1, true);
  high.audio.promotion(12, true);
  const peak = (f) => Math.max(...f.gains.flatMap((g) => g.gain.peaks));
  assert.ok(peak(high) > peak(low));
  const earlier = [...high.oscillators];
  high.audio.promotion(11, true);
  assert.ok(earlier.every((o) => o.disconnected && o.stops === 0));
  high.audio.stop();
  assert.ok(high.oscillators.every((o) => o.disconnected));
});

test('all general fanfares have a finite frequency for every scheduled note',()=>{
  for(let rank=1;rank<=LAST_RANK;rank++){
    const f=audioFixture();f.audio.promotion(rank,true);
    assert.ok(f.oscillators.every(o=>o.frequency.values.every(Number.isFinite)),`rank ${rank} must not schedule an undefined pitch`);
    assert.equal(f.oscillators.length,promotionProfile(rank).notes+3);
  }
});
