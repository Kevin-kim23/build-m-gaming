import { promotionProfile } from "./promotion.js";
import { reportError } from "./diagnostics.js";

// One reusable audio context; completed voices are disconnected immediately.
export function createSynthAudio(
  createContext = () =>
    new (window.AudioContext || window.webkitAudioContext)(),
) {
  let context;
  const voices = new Set();
  function stop() {
    for (const voice of voices) {
      try {
        voice.oscillator.stop();
      } catch (error) {
        // Stopping a voice that already ended throws; only record anything else.
        if (error?.name !== 'InvalidStateError') reportError('audio.stop', error);
      }
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
  // 전투처럼 소리가 많이 겹치는 곳에서도 동시에 울리는 소리는 MAX_VOICES개까지만 만든다.
  const MAX_VOICES = 12;
  function tone(frequency, start, duration, volume, type = "sine") {
    if (voices.size >= MAX_VOICES) return;
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
    // 전투 효과음: deploy(출격), shot(사격), boom(폭발), hit(기지 피격), win, lose. 호출하는 쪽이 너무 자주 부르지 않게 간격을 둔다.
    battle(kind, enabled) {
      play(enabled, (t) => {
        if (kind === "deploy") { tone(300, t, 0.09, 0.035, "square"); tone(450, t + 0.07, 0.12, 0.03, "square"); }
        else if (kind === "shot") tone(180, t, 0.06, 0.02, "sawtooth");
        else if (kind === "boom") { tone(90, t, 0.22, 0.05, "sawtooth"); tone(55, t + 0.03, 0.28, 0.04, "square"); }
        else if (kind === "hit") { tone(120, t, 0.16, 0.05, "square"); tone(80, t + 0.05, 0.2, 0.04, "sawtooth"); }
        else if (kind === "win") for (const [i, f] of [523, 659, 784, 1047].entries()) tone(f, t + i * 0.12, 0.26, 0.04, "triangle");
        else if (kind === "lose") for (const [i, f] of [392, 330, 262].entries()) tone(f, t + i * 0.18, 0.34, 0.04, "triangle");
      });
    },
    promotion(rank, enabled) {
      stop();
      play(enabled, (t) => {
        const p = promotionProfile(rank),
          melody = [392, 494, 587, 784, 988, 1175, 1568, 2093];
        for (let i = 0; i < p.notes; i++)
          tone(melody[i], t + i * 0.14, 0.3, p.volume * 0.5, "triangle");
        const end = t + p.notes * 0.14;
        for (const note of [523.25, 659.25, 784])
          tone(note, end, 0.85, p.volume / 3, "triangle");
      });
    },
  };
}

