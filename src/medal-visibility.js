import { ACHIEVEMENTS } from './achievements.js';
import { reportError } from './diagnostics.js';

// Which earned medals appear on the home shelf. A per-device display preference:
// it never touches the game save, and unknown or stale ids are dropped when read.
const KNOWN = new Set(ACHIEVEMENTS.map((item) => item.id));

export function parseHiddenMedals(raw) {
  try {
    const list = JSON.parse(raw ?? '[]');
    return new Set(Array.isArray(list) ? list.filter((id) => KNOWN.has(id)) : []);
  } catch (error) {
    reportError('medals.parseHidden', error);
    return new Set();
  }
}
export const serializeHiddenMedals = (hidden) => JSON.stringify([...hidden].filter((id) => KNOWN.has(id)));
export const shelfMedals = (earned, hidden) => earned.filter((id) => !hidden.has(id));
export function toggleHiddenMedal(hidden, id) {
  const next = new Set(hidden);
  if (!KNOWN.has(id)) return next;
  if (!next.delete(id)) next.add(id);
  return next;
}
