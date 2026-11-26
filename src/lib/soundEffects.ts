// Web Audio API Synthesizer for Short Fantasy / Magical Crystal UI Click Sound

let audioCtx: AudioContext | null = null;
let sfxEnabled = true;

// Gentle pentatonic high crystal frequencies for subtle variation on consecutive clicks
const FANTASY_ROOT_NOTES = [1046.5, 1174.66, 1318.51, 1567.98]; // C6, D6, E6, G6
let noteIndex = 0;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function isFantasySfxEnabled(): boolean {
  return sfxEnabled;
}

export function setFantasySfxEnabled(enabled: boolean): void {
  sfxEnabled = enabled;
}

/**
 * Plays a short, crisp fantasy crystal/fairy chime click (~110ms)
 */
export function playFantasyClickSound(): void {
  if (!sfxEnabled) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // Pick root note and a magical 5th/octave sparkle harmonic
    const baseFreq = FANTASY_ROOT_NOTES[noteIndex % FANTASY_ROOT_NOTES.length];
    noteIndex = (noteIndex + 1) % FANTASY_ROOT_NOTES.length;
    const sparkleFreq = baseFreq * 1.5; // Perfect fifth above
    const shimmerFreq = baseFreq * 2.0; // Octave shimmer

    // Master gain for the click so it blends pleasantly with background music
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.22, now);
    masterGain.connect(ctx.destination);

    // 1. Crisp crystal pluck (Triangle + Sine blend, 0ms -> 85ms)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(baseFreq, now);
    osc1.frequency.exponentialRampToValueAtTime(baseFreq * 1.08, now + 0.04);

    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.linearRampToValueAtTime(0.75, now + 0.004);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.085);

    osc1.connect(gain1);
    gain1.connect(masterGain);
    osc1.start(now);
    osc1.stop(now + 0.09);

    // 2. Magical fairy chime overtone (Delayed by 16ms -> 115ms)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(sparkleFreq, now + 0.016);
    osc2.frequency.exponentialRampToValueAtTime(shimmerFreq, now + 0.075);

    gain2.gain.setValueAtTime(0.001, now + 0.016);
    gain2.gain.linearRampToValueAtTime(0.55, now + 0.022);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.115);

    osc2.connect(gain2);
    gain2.connect(masterGain);
    osc2.start(now + 0.016);
    osc2.stop(now + 0.12);
  } catch {
    // Ignore audio context errors if blocked
  }
}
