// Gallery shell: renders candidates, keeps per-phone preview state, paints cached gear art.
import './style.css';
import {SAMPLE, CARDS} from './data.js';
import {STAGE_CANDIDATES} from './stage-candidates.js';
import {DECK_CANDIDATES, freshDeckState, handleDeck, dropOnSlot} from './deck-candidates.js';
import {drawEquipment} from '../../src/equipment-art.js';
import {statusOf} from './data.js';

const levelOf = id => CARDS.find(c => c.id === id)?.level ?? 1;
const artCache = new Map();
function paint(root) {
  root.querySelectorAll('canvas[data-art]').forEach(canvas => {
    const id = canvas.dataset.art, key = `${id}-${canvas.width}x${canvas.height}`;
    if (!artCache.has(key)) {
      const off = document.createElement('canvas'); off.width = canvas.width; off.height = canvas.height;
      drawEquipment(off, levelOf(id), id); artCache.set(key, off);
    }
    const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(artCache.get(key), 0, 0);
  });
}
const stageState = new Map(STAGE_CANDIDATES.map(c => [c.id, {id: SAMPLE.current, filter: 'all'}]));
const deckState = new Map(DECK_CANDIDATES.map(c => [c.id, freshDeckState()]));
const option = (c, kind) => `<article class="candidate" id="${kind}-${c.id}"><div class="cand-head"><span class="cand-letter">${c.id}</span><div><h3>${c.title}</h3><small>${c.tag}</small></div></div>
  <p class="cand-copy">${c.copy}</p><dl class="cand-pc"><div><dt>좋은 점</dt><dd>${c.pros}</dd></div><div><dt>주의할 점</dt><dd>${c.cons}</dd></div></dl>
  <div class="phone" data-kind="${kind}" data-cand="${c.id}"></div></article>`;
document.querySelector('#stage-grid').innerHTML = STAGE_CANDIDATES.map(c => option(c, 'stage')).join('');
document.querySelector('#deck-grid').innerHTML = DECK_CANDIDATES.map(c => option(c, 'deck')).join('');

function render(phone) {
  const {kind, cand} = phone.dataset;
  if (kind === 'stage') {
    const s = stageState.get(cand), c = STAGE_CANDIDATES.find(x => x.id === cand);
    phone.innerHTML = c.render(s.id, s.filter);
    // Open with the chosen stage in the middle of whichever list scrolls.
    const box = phone.querySelector('.phone-content'), sel = box?.querySelector('.selected');
    if (box && sel && box.scrollHeight > box.clientHeight) {
      const top = sel.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop;
      box.scrollTop = top - box.clientHeight / 2 + sel.offsetHeight / 2;
    }
  } else phone.innerHTML = DECK_CANDIDATES.find(x => x.id === cand).render(deckState.get(cand));
  paint(phone);
}
document.querySelectorAll('.phone').forEach(render);

document.addEventListener('click', event => {
  const b = event.target.closest('button,[data-pick]'), phone = b?.closest('.phone');
  if (b?.dataset.width) { document.documentElement.style.setProperty('--phone-w', b.dataset.width + 'px'); document.querySelectorAll('[data-width]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); return; }
  if (!phone || b.disabled || b.getAttribute('aria-disabled') === 'true') return;
  if (phone.dataset.kind === 'stage') {
    const s = stageState.get(phone.dataset.cand), d = b.dataset;
    if (d.pick) s.id = Number(d.pick);
    else if (d.step) s.id = Math.min(SAMPLE.current, Math.max(1, s.id + Number(d.step)));
    else if (d.nation) { const first = Number(d.nation); s.id = Math.min(SAMPLE.current, Math.max(first, first + 19 < SAMPLE.current ? first + 19 : SAMPLE.current)); }
    else if (d.filter) s.filter = d.filter;
    else if (d.cta !== undefined) { toast(phone, statusOf(s.id) === 'locked' ? '잠긴 스테이지예요.' : `스테이지 ${s.id} 출격 (시안이라 실제 전투는 시작하지 않아요)`); return; }
    else if (d.openList !== undefined) { toast(phone, '전체 스테이지 목록이 열립니다 (4안 화면과 같은 목록)'); return; }
    else return;
    render(phone);
  } else {
    if (b.classList.contains('cta')) { toast(phone, `${deckState.get(phone.dataset.cand).deck.length}개 장비로 출격 (시안)`); return; }
    if (handleDeck(deckState.get(phone.dataset.cand), b)) render(phone);
  }
});
document.addEventListener('keydown', event => {
  const g = event.target.closest?.('g[data-pick]');
  if (g && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); g.dispatchEvent(new MouseEvent('click', {bubbles: true})); }
});
function toast(phone, text) {
  let t = phone.querySelector('.phone-toast');
  if (!t) { t = document.createElement('p'); t.className = 'phone-toast'; t.setAttribute('role', 'status'); phone.append(t); }
  t.textContent = text; clearTimeout(t._timer); t.hidden = false; t._timer = setTimeout(() => { t.hidden = true; }, 2200);
}

// Drag and drop for candidate C (pointer events; tap fallback is handled by the click rules).
let drag = null;
document.addEventListener('pointerdown', event => {
  const cardEl = event.target.closest('.phone[data-cand="C"] [data-collect]');
  if (!cardEl) return;
  drag = {id: cardEl.dataset.collect, el: cardEl, x: event.clientX, y: event.clientY, ghost: null, phone: cardEl.closest('.phone')};
});
document.addEventListener('pointermove', event => {
  if (!drag) return;
  if (!drag.ghost && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 8) return;
  if (!drag.ghost) { drag.ghost = drag.el.cloneNode(true); drag.ghost.classList.add('drag-ghost'); document.body.append(drag.ghost); paint(drag.ghost); }
  drag.ghost.style.transform = `translate(${event.clientX - 40}px, ${event.clientY - 50}px)`;
  drag.phone.querySelectorAll('[data-slot]').forEach(s => { const r = s.getBoundingClientRect(); s.classList.toggle('drop-target', event.clientX > r.left && event.clientX < r.right && event.clientY > r.top && event.clientY < r.bottom); });
});
document.addEventListener('pointerup', event => {
  if (!drag) return;
  const target = drag.phone.querySelector('.drop-target');
  if (drag.ghost) { drag.ghost.remove(); if (target && dropOnSlot(deckState.get('C'), drag.id, Number(target.dataset.slot))) { const p = drag.phone; drag = null; render(p); event.preventDefault(); return; } }
  drag.phone.querySelectorAll('.drop-target').forEach(s => s.classList.remove('drop-target'));
  drag = null;
});
