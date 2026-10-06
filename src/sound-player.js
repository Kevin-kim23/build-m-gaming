import { audioUrl, SFX_IDS, soundGain, soundGap } from './audio-catalog.js';
import { reportError } from './diagnostics.js';

// Short effects are decoded once. No late playback after asynchronous loading, mute or backgrounding.
export function createSoundPlayer({ getContext, fetchAudio = globalThis.fetch, now = () => performance.now(), onError = reportError, maxVoices = 10 } = {}) {
  const buffers = new Map(), pending = new Map(), failed = new Set(), last = new Map(), voices = new Set();
  const known = new Set(SFX_IDS);
  let suspended = false;
  async function preload(id) {
    if (!known.has(id) || failed.has(id)) return null;
    if (buffers.has(id)) return buffers.get(id);
    if (pending.has(id)) return pending.get(id);
    const job = (async () => {
      try {
        const response = await fetchAudio(audioUrl(id));
        if (!response.ok) throw new Error(`Sound ${id}: HTTP ${response.status}`);
        const context = getContext(), buffer = await context.decodeAudioData(await response.arrayBuffer());
        buffers.set(id, buffer); return buffer;
      } catch (error) { failed.add(id); onError('audio.loadEffect', error); return null; }
      finally { pending.delete(id); }
    })();
    pending.set(id, job); return job;
  }
  function release(voice) {
    if (!voices.delete(voice)) return;
    voice.source.onended = null;
    voice.source.disconnect(); voice.gain.disconnect();
  }
  function stop() {
    for (const voice of [...voices]) {
      try { voice.source.stop(); } catch (error) { if (error?.name !== 'InvalidStateError') onError('audio.stopEffect', error); }
      release(voice);
    }
    last.clear();
  }
  function play(id, { gain = 1, rate = 1, priority = false } = {}) {
    if (suspended || !known.has(id)) return 'ignored';
    if (failed.has(id)) return 'failed';
    const time = now();
    if (time - (last.get(id) ?? -Infinity) < soundGap(id)) return 'ignored';
    const buffer = buffers.get(id);
    if (!buffer) { void preload(id); return 'loading'; }
    if (voices.size >= maxVoices) {
      if (!priority) return 'ignored';
      const oldest = voices.values().next().value;
      try { oldest.source.stop(); } catch (error) { if (error?.name !== 'InvalidStateError') onError('audio.replaceEffect', error); }
      release(oldest);
    }
    last.set(id, time);
    let voice;
    try {
      const context = getContext(), source = context.createBufferSource(), volume = context.createGain();
      voice = { source, gain: volume }; voices.add(voice);
      source.buffer = buffer; source.playbackRate.value = Math.max(0.75, Math.min(1.25, rate));
      volume.gain.value = Math.max(0, Math.min(1, soundGain(id) * gain));
      source.connect(volume); volume.connect(context.destination);
      source.onended = () => release(voice); source.start();
      return 'played';
    } catch (error) { if (voice) release(voice); onError('audio.playEffect', error); return 'failed'; }
  }
  return { preload, play, stop, suspend(value) { suspended = value; if (value) stop(); }, get activeVoices() { return voices.size; } };
}
