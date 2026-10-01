import test from 'node:test';
import assert from 'node:assert/strict';
import { openDetail, closeDetail, onDetailAction } from '../src/detail-popup.js';

test('shared details keep padding clicks open, close on backdrop or close control, and route shortcuts once', () => {
  const previous = global.document, events = new Map();
  let creations = 0, attached = 0, openings = 0, actions = 0;
  const dialog = {
    open: false, scrollTop: 100, innerHTML: '', setAttribute() {},
    addEventListener: (type, handler) => events.set(type, handler),
    getBoundingClientRect: () => ({ left: 20, right: 300, top: 40, bottom: 520 }),
    closest: () => null,
    showModal() { this.open = true; openings++; },
    close() { this.open = false; },
  };
  global.document = {
    createElement: () => { creations++; return dialog; },
    body: { append: () => attached++ },
  };
  try {
    const content = { title: '견인포', body: '<p>장비 설명</p>' };
    openDetail(content);
    for (const [x, y] of [[21, 100], [299, 100], [100, 519], [20, 40]]) {
      events.get('click')({ target: dialog, clientX: x, clientY: y });
      assert.equal(dialog.open, true, 'inside padding must not dismiss the detail');
    }
    for (const [x, y] of [[19, 100], [301, 100], [100, 39], [100, 521]]) {
      openDetail(content);
      events.get('click')({ target: dialog, clientX: x, clientY: y });
      assert.equal(dialog.open, false, 'backdrop dismisses the detail');
    }
    openDetail(content);
    const action = { dataset: { detailAction: 'manage-equipment', id: 'artillery' } };
    onDetailAction((name, data, node) => {
      assert.equal(name, 'manage-equipment'); assert.equal(data.id, 'artillery');
      assert.equal(node, dialog); actions++;
    });
    events.get('click')({ target: { closest: selector => selector === '[data-detail-action]' ? action : null } });
    assert.equal(actions, 1);
    events.get('click')({ target: { closest: selector => selector === '[data-detail-close]' ? {} : null } });
    assert.equal(dialog.open, false);
    openDetail(content);
    const before = openings;
    openDetail({ title: '전차', body: '<p>새 설명</p>' });
    assert.equal(openings, before);
    assert.match(dialog.innerHTML, /전차/);
    assert.equal(dialog.scrollTop, 0);
    assert.equal(creations, 1); assert.equal(attached, 1); assert.equal(events.size, 1);
  } finally {
    closeDetail(); global.document = previous;
  }
});
