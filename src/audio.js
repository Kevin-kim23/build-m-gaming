import { promotionProfile } from "./promotion.js";
import { reportError } from "./diagnostics.js";

// One reusable audio context; completed voices are disconnected immediately.
export function createGameAudio(
  createContext = () =>
    new (window.AudioContext || window.webkitAudioContext)(),
) {
  let context;
  const voices = new Set();
  function stop() {
    for (const voice of voices) {
      try {
        voice.oscillator.stop();
      } catch {}
      voice.oscillator.disconnect();
      voice.gain.disconnect();
    }
    voices.clear();
  }
  function play(enabled, schedule) {
    if (!enabled) return;
    try {
      context ??= createContext();
      Promise.resolve(context.resume()).catch((error) =>
        reportError("audio.resume", error),
      );
      schedule(context.currentTime);
    } catch (error) {
      reportError("audio.play", error);
    }
  }
  function tone(frequency, start, duration, volume, type = "sine") {
    const oscillator = context.createOscillator(),
      gain = context.createGain();
    const voice = { oscillator, gain };
    voices.add(voice);
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
      voices.delete(voice);
    };
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }
  return {
    stop,
    tap(enabled) {
      play(enabled, (t) => tone(820, t, 0.13, 0.035));
    },
    recruit(enabled) {
      play(enabled, (t) => {
        tone(540, t, 0.12, 0.03);
        tone(810, t + 0.1, 0.2, 0.035);
      });
    },
    promotion(rank, enabled) {
      stop();
      play(enabled, (t) => {
        const p = promotionProfile(rank),
          melody = [392, 494, 587, 784, 988, 1175, 1568];
        for (let i = 0; i < p.notes; i++)
          tone(melody[i], t + i * 0.14, 0.3, p.volume * 0.5, "triangle");
        const end = t + p.notes * 0.14;
        for (const note of [523.25, 659.25, 784])
          tone(note, end, 0.85, p.volume / 3, "triangle");
      });
    },
  };
}
