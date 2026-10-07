// Visibility and native app callbacks often arrive together. Keep one session transition,
// and do not acquire the save lock or award offline income until the title is accepted.
export function createGameLifecycle({ session, opening, onPause = () => {},
  isHidden = () => document.hidden }) {
  let started = false, running = false, nativeActive = true, pageActive = true;
  const visible = () => nativeActive && pageActive && !isHidden();
  function sync() {
    const active = visible();
    opening.setActive(active);
    const shouldRun = started && active;
    if (shouldRun === running) return;
    running = shouldRun;
    if (running) session.start();
    else { session.pause(); onPause(); }
  }
  return {
    get canRun() { return started && visible(); },
    get started() { return started; },
    start() { if (!started) { started = true; sync(); } },
    syncVisibility: sync,
    setNativeActive(value) { nativeActive = !!value; sync(); },
    pageHide() { pageActive = false; sync(); },
    pageShow() { pageActive = true; sync(); },
  };
}
