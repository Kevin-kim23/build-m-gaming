// Serialize native calls: a slow initial hide must never finish after the game's show.
export function createOpeningSystemBars({native, bars, onError}) {
  let opening = true, pending = Promise.resolve();
  function sync() {
    if (!native) return pending;
    pending = pending.then(() => opening ? bars.hide() : bars.show())
      .catch(error => onError('opening.systemBars', error));
    return pending;
  }
  return {sync, finish() { opening = false; return sync(); }};
}
