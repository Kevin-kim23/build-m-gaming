import { guideStep } from './guide.js';
import { reportError } from './diagnostics.js';
import './guide.css';

// The guide step itself is derived from the game state (see guide.js). Only "turn the guide off"
// is remembered, as a per-device display preference outside the save, written when pressed.
const OFF_KEY = 'budae-kiugi-ui-guide-off';
function readOff() {
  try { return localStorage.getItem(OFF_KEY) === '1'; } catch (error) { reportError('guide.readOff', error); return false; }
}
function writeOff() {
  try { localStorage.setItem(OFF_KEY, '1'); } catch (error) { reportError('guide.saveOff', error); }
}
let off = readOff();

// Shared with the shop so it can highlight the same target.
export const currentGuide = (state) => (off ? null : guideStep(state));

// Updates the DOM only when the shown step (or its text) changes, never on every tick.
export function createGuideUI() {
  const box = document.querySelector('#coach'), text = document.querySelector('#coach-text');
  const shop = document.querySelector('#open-shop');
  let shown = null, lastState = null;
  function sync(state) {
    lastState = state;
    const step = currentGuide(state);
    const key = step ? `${step.id}|${step.text}|${step.pulse}` : '';
    if (key === shown) return;
    shown = key;
    box.hidden = !step;
    if (step) text.textContent = step.text;
    shop.classList.toggle('guide-pulse', !!step?.pulse);
  }
  document.querySelector('#coach-off').addEventListener('click', () => {
    off = true;
    writeOff();
    if (lastState) sync(lastState);
  });
  return { sync };
}
