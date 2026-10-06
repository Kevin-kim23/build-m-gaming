// UI-local identity tracking also sees events created at the already-painted simulation time.
// WeakSet does not retain old effects or change battle state / save data.
export function createBattleAudioEvents() {
  let seen = new WeakSet();
  return {
    take(events) {
      const fresh = [];
      for (const event of events) if (!seen.has(event)) { seen.add(event); fresh.push(event); }
      return fresh;
    },
    reset() { seen = new WeakSet(); },
  };
}
