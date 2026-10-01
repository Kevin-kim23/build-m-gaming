// Tracks fingers that are currently down on the tap zone so several fingers can tap at once.
// Pure bookkeeping (no DOM): at most `max` fingers count at the same time, extra ones are ignored.
export const MAX_SIMULTANEOUS_TAPS = 4;

export function createTapTracker(max = MAX_SIMULTANEOUS_TAPS, staleMs = 5000) {
  const down = new Map(); // pointer id -> time it went down
  return {
    // Returns true when this finger should earn gold.
    down(id, now) {
      // A release that never arrived (finger lifted outside the window, app switch) must not block taps forever.
      for (const [key, since] of down) if (now - since > staleMs) down.delete(key);
      if (down.has(id)) { down.set(id, now); return true; }
      if (down.size >= max) return false;
      down.set(id, now);
      return true;
    },
    up(id) { down.delete(id); },
    clear() { down.clear(); },
    get size() { return down.size; },
  };
}
