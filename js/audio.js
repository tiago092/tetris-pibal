// ---- Audio ----
let audioCtx = null;
let musicEl = null;
let currentMusicLevel = -1;
let musicUnlocked = false;
let fadeInterval = null;
let musicMuted = false;

function unlockAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();

  // iOS/Android requieren reproducir un audio real en el primer gesto para desbloquearlo
  const silent = new Audio();
  silent.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
  silent.volume = 0;
  silent.play().catch(() => {});

  // forzar reproducción de introMusic si ya estaba pendiente
  if (introMusic.paused && introMusic.src) {
    introMusic.play().catch(() => {});
  }
}

function makeLandSound() {
  if (!audioCtx) return;
  const sr = audioCtx.sampleRate, dur = 0.08;
  const n = Math.floor(sr * dur);
  const buf = audioCtx.createBuffer(1, n, sr);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) {
    const t = i / sr, env = Math.max(0, 1 - t/dur);
    data[i] = env * 0.55 * Math.sin(2*Math.PI*140*t);
  }
  return buf;
}

function makeLineClearSound() {
  if (!audioCtx) return null;
  const sr = audioCtx.sampleRate, dur = 0.18;
  const n = Math.floor(sr * dur);
  const buf = audioCtx.createBuffer(1, n, sr);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const env = Math.max(0, 1 - t / dur);
    const freq = 300 + (600 * t / dur);
    data[i] = env * 0.5 * Math.sin(2 * Math.PI * freq * t);
  }
  return buf;
}

function playLineClearSound() {
  if (!audioCtx) return;
  const buf = makeLineClearSound();
  if (!buf) return;
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  const gain = audioCtx.createGain();
  gain.gain.value = 0.6;
  src.connect(gain); gain.connect(audioCtx.destination);
  src.start();
}

function playLandSound() {
  if (!audioCtx) return;
  const buf = makeLandSound();
  if (!buf) return;
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  const gain = audioCtx.createGain();
  gain.gain.value = 0.4;
  src.connect(gain); gain.connect(audioCtx.destination);
  src.start();
}

function playHardDropSound() {
  if (!audioCtx) return;
  const sr = audioCtx.sampleRate;
  const dur = 0.14;
  const n = Math.floor(sr * dur);
  const buf = audioCtx.createBuffer(1, n, sr);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const env = Math.exp(-t * 40);
    const click = Math.sin(2 * Math.PI * 220 * t) * 0.6
                + Math.sin(2 * Math.PI * 440 * t) * 0.3
                + Math.sin(2 * Math.PI * 880 * t) * 0.1;
    const tail = (Math.random() * 2 - 1) * Math.exp(-t * 80) * 0.25;
    data[i] = env * click + tail;
  }
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  const gain = audioCtx.createGain();
  gain.gain.value = 0.7;
  src.connect(gain); gain.connect(audioCtx.destination);
  src.start();
}

function playRotateSound() {
  if (!audioCtx) return;
  const sr = audioCtx.sampleRate, dur = 0.07;
  const n = Math.floor(sr * dur);
  const buf = audioCtx.createBuffer(1, n, sr);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const env = Math.exp(-t * 35);
    data[i] = env * (Math.sin(2 * Math.PI * 900 * t) * 0.5
                   + Math.sin(2 * Math.PI * 1350 * t) * 0.3);
  }
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  const gain = audioCtx.createGain();
  gain.gain.value = 0.3;
  src.connect(gain); gain.connect(audioCtx.destination);
  src.start();
}

function playMenuTick() {
  if (!audioCtx) return;
  const sr = audioCtx.sampleRate, dur = 0.055;
  const n = Math.floor(sr * dur);
  const buf = audioCtx.createBuffer(1, n, sr);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const env = Math.max(0, 1 - t / dur);
    data[i] = env * 0.35 * Math.sin(2 * Math.PI * 520 * t);
  }
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  const gain = audioCtx.createGain();
  gain.gain.value = 0.5;
  src.connect(gain); gain.connect(audioCtx.destination);
  src.start();
}

function loadSound(path, volume=1.0) {
  const a = new Audio(path);
  a.volume = volume;
  return a;
}

const lineSound    = loadSound(SOUND_CONFIG.lineClear, 0.8);
const levelupSound  = loadSound(SOUND_CONFIG.levelUp,  0.9);
const levelupSound2 = loadSound(SOUND_CONFIG.levelUp2, 0.9);
const deathSound    = loadSound(SOUND_CONFIG.death,    1.0);
const defeatSong    = new Audio(SOUND_CONFIG.defeatSong);
defeatSong.loop     = true;
defeatSong.volume   = 0.8;
const monsterSound = loadSound(SOUND_CONFIG.monster,   1.0);

function playSound(el) {
  if (!el || !musicUnlocked) return;
  el.currentTime = 0;
  el.play().catch(()=>{});
}

function stopMusic() {
  if (fadeInterval) { clearInterval(fadeInterval); fadeInterval = null; }
  if (musicEl) { musicEl.pause(); musicEl.src = ''; musicEl = null; }
  currentMusicLevel = -1;
}

function toggleMute() {
  musicMuted = !musicMuted;
  introMusic.muted = musicMuted;
  if (musicEl) musicEl.muted = musicMuted;
  levelBgAudio.muted = musicMuted;
  defeatSong.muted = musicMuted;
}

function playMusic(level) {
  const FADE_MS = 2000;
  const TARGET = getTheme(level).musicVolume ?? 0.5;
  const STEP_MS = 50;

  if (fadeInterval) { clearInterval(fadeInterval); fadeInterval = null; }

  const src = getTheme(level).music;
  if (!src) { stopMusic(); return; }
  const incoming = new Audio(src);
  incoming.loop = true;
  incoming.volume = 0;
  incoming.muted = musicMuted;

  const outgoing = musicEl;
  musicEl = incoming;

  function startFade() {
    if (musicEl !== incoming) { incoming.pause(); incoming.src = ''; return; }
    const steps = FADE_MS / STEP_MS;
    let tick = 0;
    fadeInterval = setInterval(() => {
      if (musicEl !== incoming) {
        clearInterval(fadeInterval); fadeInterval = null;
        incoming.pause(); incoming.src = '';
        return;
      }
      tick++;
      const t = Math.min(1, tick / steps);
      incoming.volume = t * TARGET;
      if (outgoing) outgoing.volume = (1 - t) * TARGET;
      if (t >= 1) {
        clearInterval(fadeInterval); fadeInterval = null;
        if (outgoing) { outgoing.pause(); outgoing.src = ''; }
      }
    }, STEP_MS);
  }

  incoming.play().then(() => {
    startFade();
  }).catch(() => {
    incoming.volume = TARGET;
    if (outgoing) { outgoing.pause(); outgoing.src = ''; }
  });
}

function checkMusic(level) {
  if (level !== currentMusicLevel) {
    currentMusicLevel = level;
    const theme = getTheme(level);
    const shouldPlay = theme.bg.type !== 'video' || theme.bg.keepMusic || theme.bg.muted;
    if (shouldPlay) playMusic(level);
  }
}
