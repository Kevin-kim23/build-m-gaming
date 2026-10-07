export const OPENING_LOAD_TIMEOUT_MS = 8000;
export const OPENING_STALL_TIMEOUT_MS = 5000;
export const OPENING_MAX_PLAY_MS = 30000;

// One instance per document. Launch is deliberately not stored in the game save or preferences.
export function createOpeningScreen({ root = document, onStart, onError, soundEnabled = true,
  now = Date.now, setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
  const layer = root.querySelector('#opening');
  const video = root.querySelector('#opening-video');
  const title = root.querySelector('#opening-title');
  const art = root.querySelector('#opening-art');
  const app = root.querySelector('#app');
  let stage = 'logo', active = false, attempt = 0;
  let watchdog = null, deadline = null, remaining = OPENING_MAX_PLAY_MS;
  let playing = false, lastPosition = 0;
  const listeners = [];
  function listen(node, type, callback) {
    node.addEventListener(type, callback);
    listeners.push(() => node.removeEventListener(type, callback));
  }
  function clearWatchdog() {
    if (watchdog !== null) clearTimer(watchdog);
    watchdog = null;
  }
  function stopClock() {
    clearWatchdog();
    if (deadline !== null) remaining = Math.max(0, deadline - now());
    deadline = null;
  }
  function armWatchdog(delay) {
    clearWatchdog();
    if (!active || stage !== 'logo') return;
    watchdog = setTimer(() => {
      watchdog = null;
      onError?.('opening.timeout', new Error('Studio video did not finish in time'));
      showTitle();
    }, Math.max(0, Math.min(delay, deadline - now())));
  }
  function showTitle() {
    if (stage !== 'logo') return;
    stage = 'title';
    attempt++;
    stopClock();
    video.pause();
    video.hidden = true;

    title.hidden = false;
    layer.dataset.stage = stage;
    if (active) title.focus({ preventScroll: true });
  }
  function mediaFailure(error, ticket) {
    if (stage !== 'logo' || !active || ticket !== attempt) return;
    onError?.('opening.video', error instanceof Error ? error : new Error('Studio video could not play'));
    showTitle();
  }
  function play() {
    const ticket = ++attempt;
    deadline = now() + remaining;
    armWatchdog(playing ? OPENING_STALL_TIMEOUT_MS : OPENING_LOAD_TIMEOUT_MS);
    requestPlayback(ticket);
  }
  function requestPlayback(ticket) {
    function failed(error) {
      if (stage !== 'logo' || !active || ticket !== attempt) return;
      // Native WebView allows the supplied logo sound. Browsers may require muted autoplay.
      if (error?.name === 'NotAllowedError' && !video.muted) {
        video.muted = true;
        video.defaultMuted = true;
        requestPlayback(ticket);
      } else mediaFailure(error, ticket);
    }
    try { Promise.resolve(video.play()).catch(failed); }
    catch (error) { failed(error); }
  }
  function setActive(value) {
    value = !!value;
    if (active === value || stage === 'complete') return;
    active = value;
    layer.classList.toggle('is-paused', !active);
    if (stage !== 'logo') return;
    if (active) play();
    else {
      attempt++; // A rejection from the interrupted play promise is now stale.
      stopClock();
      video.pause();
    }
  }
  function start(event) {
    // Finish on click (pointer release), so the launch gesture never reaches the field.
    event.preventDefault();
    event.stopPropagation();
    if (stage !== 'title' || !active) return;
    stage = 'complete';
    attempt++;
    stopClock();
    for (const remove of listeners) remove();
    video.pause();
    video.removeAttribute('src');
    video.load(); // Release the decoded clip; it is never replayed on resume.
    layer.hidden = true;
    layer.dataset.stage = stage;
    app.inert = false;
    app.removeAttribute('aria-hidden');
    onStart();
  }
  video.muted = !soundEnabled;
  video.defaultMuted = !soundEnabled;
  video.playsInline = true;
  app.inert = true;
  listen(video, 'ended', showTitle);
  listen(video, 'error', () => mediaFailure(new Error('Studio video could not load'), attempt));
  listen(video, 'playing', () => {
    playing = true;
    armWatchdog(OPENING_STALL_TIMEOUT_MS);
  });
  listen(video, 'timeupdate', () => {
    // Stalled media can still emit events. Only actual playback progress resets the timer.
    if (video.currentTime <= lastPosition) return;
    lastPosition = video.currentTime;
    armWatchdog(OPENING_STALL_TIMEOUT_MS);
  });
  listen(title, 'click', start);
  listen(art, 'error', () => {
    art.hidden = true;
    onError?.('opening.image', new Error('Title illustration could not load'));
  });
  if (art.complete && art.naturalWidth === 0) art.hidden = true;
  // A cached media failure may have happened before JavaScript was ready.
  if (video.error) showTitle();
  return { setActive, get stage() { return stage; } };
}
