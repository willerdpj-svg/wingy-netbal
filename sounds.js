// Wingy Netball — Web Audio API Sound Synthesis
// No external audio files needed — all sounds are generated programmatically

let audioCtx = null;

function ensureAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Helper: create a gain node with envelope
function makeGain(ctx, volume, fadeOut, startTime, duration) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(volume, startTime);
  g.gain.linearRampToValueAtTime(0, startTime + duration * fadeOut);
  return g;
}

// ── Shoot: soft whoosh ──
function playShoot() {
  const ctx = ensureAudio();
  const duration = 0.15;
  const now = ctx.currentTime;

  // White noise burst through bandpass filter
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(2000, now);
  filter.frequency.linearRampToValueAtTime(800, now + duration);
  filter.Q.value = 1;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.25, now + 0.02);
  gain.gain.linearRampToValueAtTime(0, now + duration);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start(now);
  source.stop(now + duration);
}

// ── Goal: happy chime / sparkle ──
function playGoal() {
  const ctx = ensureAudio();
  const now = ctx.currentTime;

  // Major chord: C5, E5, G5
  const freqs = [523.25, 659.25, 783.99];
  freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;

    const gain = ctx.createGain();
    const start = now + i * 0.05;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.2, start + 0.02);
    gain.gain.linearRampToValueAtTime(0, start + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.35);
  });

  // High shimmer
  const shimmer = ctx.createOscillator();
  shimmer.type = 'triangle';
  shimmer.frequency.value = 2093;
  const sGain = ctx.createGain();
  sGain.gain.setValueAtTime(0, now + 0.1);
  sGain.gain.linearRampToValueAtTime(0.06, now + 0.15);
  sGain.gain.linearRampToValueAtTime(0, now + 0.5);
  shimmer.connect(sGain);
  sGain.connect(ctx.destination);
  shimmer.start(now + 0.1);
  shimmer.stop(now + 0.5);
}

// ── Miss: soft descending pop ──
function playMiss() {
  const ctx = ensureAudio();
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(400, now);
  osc.frequency.linearRampToValueAtTime(150, now + 0.12);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.2, now);
  gain.gain.linearRampToValueAtTime(0, now + 0.12);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.12);
}

// ── High score fanfare: ascending arpeggio ──
function playHighScore() {
  const ctx = ensureAudio();
  const now = ctx.currentTime;

  // C5 → E5 → G5 → C6
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;

    // Add vibrato on last note
    if (i === 3) {
      const vibrato = ctx.createOscillator();
      vibrato.frequency.value = 6;
      const vibratoGain = ctx.createGain();
      vibratoGain.gain.value = 8;
      vibrato.connect(vibratoGain);
      vibratoGain.connect(osc.frequency);
      vibrato.start(now + i * 0.15);
      vibrato.stop(now + i * 0.15 + 0.5);
    }

    const gain = ctx.createGain();
    const start = now + i * 0.15;
    const dur = i === 3 ? 0.5 : 0.2;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.2, start + 0.02);
    gain.gain.linearRampToValueAtTime(0, start + dur);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + dur);
  });
}

// ── End normal: two gentle notes ──
function playEndNormal() {
  const ctx = ensureAudio();
  const now = ctx.currentTime;

  [261.63, 392.0].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;

    const gain = ctx.createGain();
    const start = now + i * 0.25;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.15, start + 0.03);
    gain.gain.linearRampToValueAtTime(0, start + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.3);
  });
}

// ── Net flash: short ding ──
function playNetFlash() {
  const ctx = ensureAudio();
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.value = 1200;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.12, now);
  gain.gain.linearRampToValueAtTime(0, now + 0.08);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.08);
}

// ═══════════════════════════════════════════════════════════
// ── CHICKEN BANANA — looping background music ──
// A bouncy, silly, kid-friendly tune
// ═══════════════════════════════════════════════════════════

let chickenBananaPlaying = false;
let chickenBananaTimer = null;
let musicMuted = false;

function toggleMuteMusic() {
  musicMuted = !musicMuted;
  if (musicMuted) {
    stopChickenBanana();
  }
  return musicMuted;
}

function playChickenBanana() {
  if (chickenBananaPlaying || musicMuted) return;
  chickenBananaPlaying = true;
  scheduleChickenBanana();
}

function stopChickenBanana() {
  chickenBananaPlaying = false;
  if (chickenBananaTimer) {
    clearTimeout(chickenBananaTimer);
    chickenBananaTimer = null;
  }
}

function scheduleChickenBanana() {
  if (!chickenBananaPlaying) return;
  playChickenBananaLoop();
  // Loop duration is ~8.1 seconds at 100bpm, schedule next loop
  chickenBananaTimer = setTimeout(scheduleChickenBanana, 8100);
}

function playChickenBananaLoop() {
  const ctx = ensureAudio();
  const now = ctx.currentTime;
  const bpm = 100;
  const beat = 60 / bpm;
  const vol = 0.09;

  // ── Melody: bouncy, clucky, silly ──
  // "Chicken Ba-na-na!" motif
  const melody = [
    // Bar 1: "Chic-ken Ba-na-na!"
    { note: 'E5', time: 0,       dur: 0.5 },
    { note: 'G5', time: 0.5,     dur: 0.5 },
    { note: 'A5', time: 1,       dur: 0.3 },
    { note: 'G5', time: 1.3,     dur: 0.3 },
    { note: 'E5', time: 1.6,     dur: 0.4 },
    // Bar 2: playful response
    { note: 'D5', time: 2,       dur: 0.5 },
    { note: 'E5', time: 2.5,     dur: 0.3 },
    { note: 'G5', time: 2.8,     dur: 0.5 },
    { note: 'E5', time: 3.3,     dur: 0.7 },
    // Bar 3: repeat higher "Chic-ken Ba-na-na!"
    { note: 'G5', time: 4,       dur: 0.5 },
    { note: 'A5', time: 4.5,     dur: 0.5 },
    { note: 'B5', time: 5,       dur: 0.3 },
    { note: 'A5', time: 5.3,     dur: 0.3 },
    { note: 'G5', time: 5.6,     dur: 0.4 },
    // Bar 4: landing
    { note: 'E5', time: 6,       dur: 0.5 },
    { note: 'D5', time: 6.5,     dur: 0.3 },
    { note: 'C5', time: 6.8,     dur: 0.5 },
    { note: 'E5', time: 7.3,     dur: 0.7 },
    // Bar 5-6: funky bridge
    { note: 'C5', time: 8,       dur: 0.3 },
    { note: 'D5', time: 8.3,     dur: 0.3 },
    { note: 'E5', time: 8.6,     dur: 0.3 },
    { note: 'G5', time: 8.9,     dur: 0.3 },
    { note: 'A5', time: 9.2,     dur: 0.6 },
    { note: 'G5', time: 9.8,     dur: 0.3 },
    { note: 'E5', time: 10.1,    dur: 0.3 },
    { note: 'D5', time: 10.4,    dur: 0.3 },
    { note: 'C5', time: 10.7,    dur: 0.5 },
    // Bar 7-8: ending phrase
    { note: 'E5', time: 11.2,    dur: 0.4 },
    { note: 'E5', time: 11.6,    dur: 0.2 },
    { note: 'G5', time: 11.8,    dur: 0.4 },
    { note: 'A5', time: 12.2,    dur: 0.3 },
    { note: 'G5', time: 12.5,    dur: 0.3 },
    { note: 'E5', time: 12.8,    dur: 0.8 },
  ];

  // ── Bass line: bouncy groove ──
  const bass = [
    { note: 'C3', time: 0,    dur: 0.4 },
    { note: 'C3', time: 0.8,  dur: 0.3 },
    { note: 'G3', time: 1.2,  dur: 0.4 },
    { note: 'C3', time: 2,    dur: 0.4 },
    { note: 'E3', time: 2.8,  dur: 0.4 },
    { note: 'G3', time: 3.3,  dur: 0.5 },
    { note: 'C3', time: 4,    dur: 0.4 },
    { note: 'C3', time: 4.8,  dur: 0.3 },
    { note: 'G3', time: 5.2,  dur: 0.4 },
    { note: 'C3', time: 6,    dur: 0.4 },
    { note: 'G2', time: 6.5,  dur: 0.4 },
    { note: 'C3', time: 7,    dur: 0.8 },
    { note: 'A2', time: 8,    dur: 0.4 },
    { note: 'A2', time: 8.6,  dur: 0.3 },
    { note: 'E3', time: 9,    dur: 0.5 },
    { note: 'F3', time: 9.8,  dur: 0.4 },
    { note: 'G3', time: 10.4, dur: 0.4 },
    { note: 'G2', time: 11,   dur: 0.5 },
    { note: 'C3', time: 11.6, dur: 0.4 },
    { note: 'G2', time: 12,   dur: 0.4 },
    { note: 'C3', time: 12.5, dur: 1 },
  ];

  // ── Percussion: clucky beats ──
  const beats = [0, 0.8, 1.6, 2, 2.8, 3.6, 4, 4.8, 5.6, 6, 6.8, 7.6,
                 8, 8.6, 9.2, 9.8, 10.4, 11, 11.6, 12.2, 12.8];

  const noteFreqs = {
    'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196.00, 'A3': 220.00,
    'G2': 98.00, 'A2': 110.00,
    'C4': 261.63, 'D4': 293.66, 'E4': 329.63,
    'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'G5': 783.99, 'A5': 880.00, 'B5': 987.77,
  };

  const scale = beat;

  // Play melody notes
  melody.forEach(n => {
    const freq = noteFreqs[n.note];
    if (!freq) return;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;

    const gain = ctx.createGain();
    const t = now + n.time * scale;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.015);
    gain.gain.setValueAtTime(vol, t + n.dur * scale * 0.7);
    gain.gain.linearRampToValueAtTime(0, t + n.dur * scale);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + n.dur * scale + 0.01);
  });

  // Play bass notes
  bass.forEach(n => {
    const freq = noteFreqs[n.note];
    if (!freq) return;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;

    const gain = ctx.createGain();
    const t = now + n.time * scale;
    const bvol = vol * 0.8;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(bvol, t + 0.01);
    gain.gain.setValueAtTime(bvol, t + n.dur * scale * 0.6);
    gain.gain.linearRampToValueAtTime(0, t + n.dur * scale);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + n.dur * scale + 0.01);
  });

  // Play percussion (clucky hi-hat sounds)
  beats.forEach(time => {
    const bufLen = ctx.sampleRate * 0.04;
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufLen);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 5000;

    const gain = ctx.createGain();
    const t = now + time * scale;
    gain.gain.setValueAtTime(vol * 0.5, t);
    gain.gain.linearRampToValueAtTime(0, t + 0.04);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(t);
    src.stop(t + 0.05);
  });
}
