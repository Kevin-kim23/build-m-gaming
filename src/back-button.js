// Android back button: close the top-most popup first; on the bare home screen ask for a second
// press within two seconds before leaving. Closing goes through each layer's own close button so the
// side effects (stopping a battle, restoring focus) are the same as tapping ✕.
export const EXIT_CONFIRM_MS = 2000;

// Top-most first. A layer opened later always sits above the earlier ones.
export const BACK_LAYERS = Object.freeze([
  Object.freeze({ selector: '.promotion-layer', close: '[data-dismiss-promotion]' }),
  Object.freeze({ selector: '#detail-modal', close: '[data-detail-close]' }),
  Object.freeze({ selector: '#battle-modal', close: '[data-battle-close]' }),
  Object.freeze({ selector: '#achievement-modal', close: '#close-achievements' }),
  Object.freeze({ selector: '#modal', close: '#close-shop, #close-equipment' }),
]);

export function createBackHandler({ root = document, now = Date.now, hint, exit }) {
  let hintedAt = -Infinity;
  return function onBack() {
    for (const layer of BACK_LAYERS) {
      const dialog = root.querySelector(layer.selector);
      if (!dialog?.open) continue;
      hintedAt = -Infinity;
      dialog.querySelector(layer.close)?.click();
      if (dialog.open) dialog.close();
      return 'closed';
    }
    const time = now();
    if (time >= hintedAt && time - hintedAt <= EXIT_CONFIRM_MS) {
      hintedAt = -Infinity;
      exit();
      return 'exit';
    }
    hintedAt = time;
    hint('한 번 더 누르면 게임이 종료돼요');
    return 'hint';
  };
}
