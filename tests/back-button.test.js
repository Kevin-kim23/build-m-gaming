import test from 'node:test';
import assert from 'node:assert/strict';
import { createBackHandler, BACK_LAYERS, EXIT_CONFIRM_MS } from '../src/back-button.js';

// Minimal stand-ins for <dialog> elements: clicking the close button closes the dialog.
function fakeDialog({ open = false, closeSelector, closeWorks = true }) {
  const dialog = {
    open, clicked: 0, closed: 0,
    querySelector(selector) {
      return selector === closeSelector ? { click() { dialog.clicked++; if (closeWorks) dialog.open = false; } } : null;
    },
    close() { dialog.closed++; dialog.open = false; },
  };
  return dialog;
}
function setup(openSelectors = [], { closeWorks = true } = {}) {
  const dialogs = Object.fromEntries(BACK_LAYERS.map((layer) => [layer.selector, fakeDialog({ open: openSelectors.includes(layer.selector), closeSelector: layer.close, closeWorks })]));
  const log = { hints: [], exits: 0, time: 1000 };
  const handler = createBackHandler({
    root: { querySelector: (selector) => dialogs[selector] ?? null },
    now: () => log.time,
    hint: (text) => log.hints.push(text),
    exit: () => { log.exits++; },
  });
  return { dialogs, log, handler };
}

test('back closes an open popup through its own close button and never exits', () => {
  const { dialogs, log, handler } = setup(['#modal']);
  assert.equal(handler(), 'closed');
  assert.equal(dialogs['#modal'].clicked, 1);
  assert.equal(dialogs['#modal'].open, false);
  assert.deepEqual([log.exits, log.hints.length], [0, 0]);
});

test('stacked popups close one at a time, top-most first', () => {
  const { dialogs, handler } = setup(['#modal', '#detail-modal']);
  assert.equal(handler(), 'closed');
  assert.deepEqual([dialogs['#detail-modal'].open, dialogs['#modal'].open], [false, true]);
  assert.equal(handler(), 'closed');
  assert.equal(dialogs['#modal'].open, false);
});

test('the promotion celebration is dismissed before anything beneath it', () => {
  const { dialogs, handler } = setup(['#modal', '.promotion-layer']);
  handler();
  assert.deepEqual([dialogs['.promotion-layer'].open, dialogs['#modal'].open], [false, true]);
});

test('every kind of popup the game opens is covered', () => {
  for (const layer of BACK_LAYERS) {
    const { dialogs, handler } = setup([layer.selector]);
    assert.equal(handler(), 'closed', layer.selector);
    assert.equal(dialogs[layer.selector].open, false, layer.selector);
  }
  assert.deepEqual(BACK_LAYERS.map((l) => l.selector), ['#offline-reward-modal', '#test-purchase-modal', '#potion-ad-modal', '#personal-award-modal', '.promotion-layer', '#detail-modal', '#battle-modal', '#achievement-modal', '#modal']);
});

test('a popup whose close button does nothing is still closed', () => {
  const { dialogs, handler } = setup(['#battle-modal'], { closeWorks: false });
  assert.equal(handler(), 'closed');
  assert.equal(dialogs['#battle-modal'].closed, 1);
  assert.equal(dialogs['#battle-modal'].open, false);
});

test('on the home screen the first back shows a hint, a second one within two seconds exits', () => {
  const { log, handler } = setup();
  assert.equal(handler(), 'hint');
  assert.equal(log.hints.length, 1);
  assert.equal(log.exits, 0);
  log.time += EXIT_CONFIRM_MS;
  assert.equal(handler(), 'exit');
  assert.equal(log.exits, 1);
});

test('a second back after the confirm window only shows the hint again', () => {
  const { log, handler } = setup();
  handler();
  log.time += EXIT_CONFIRM_MS + 1;
  assert.equal(handler(), 'hint');
  assert.deepEqual([log.hints.length, log.exits], [2, 0]);
});

test('closing a popup does not count as the first press of the exit confirmation', () => {
  const { dialogs, log, handler } = setup(['#modal']);
  handler();
  dialogs['#modal'].open = false;
  log.time += 100;
  assert.equal(handler(), 'hint');
  assert.equal(log.exits, 0);
});

test('after exiting, the confirmation starts over', () => {
  const { log, handler } = setup();
  handler(); log.time += 10; handler();
  log.time += 10;
  assert.equal(handler(), 'hint');
});

test('closing a newly opened popup cancels the old exit hint', () => {
  const { dialogs, log, handler } = setup();
  assert.equal(handler(), 'hint');
  dialogs['#detail-modal'].open = true;
  log.time += 100;
  assert.equal(handler(), 'closed');
  log.time += 100;
  assert.equal(handler(), 'hint');
  assert.equal(log.exits, 0);
});

test('a clock rollback never accepts a stale exit confirmation', () => {
  const { log, handler } = setup();
  handler();
  log.time -= 1000;
  assert.equal(handler(), 'hint');
  assert.equal(log.exits, 0);
});
