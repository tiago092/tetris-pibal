// ============================================================
//  TETRIS PIBAL — Configuración de assets y niveles
//  Editá este archivo para cambiar fondos, música y dificultad
//  sin tocar la lógica del juego (js/game.js).
// ============================================================

// ---- Menú principal ----
const MENU_CONFIG = {
  bg:    'assets/img/achitiago-pixel.png',
  music: 'assets/sound/intro.mp3',
  optionsX: 92,
  optionsStartY: 0.60,
  optionsGap: 56,
  selectorGap: 22,
  optionFont: '800 25px "Courier New", monospace',
  optionFontSelected: '900 27px "Courier New", monospace',
  optionColor: '#f1f3ff',
  optionShadowColor: 'rgba(0,0,0,0.96)',
  optionSelectedColor: '#ffe600',
  optionSelectedGlow: 'rgba(255,205,0,0.42)',
  footerColor: 'rgba(210,218,255,0.58)',
};

// ---- Controles tactiles ----
const TOUCH_CONFIG = {
  storageKey: 'tetris-pibal.touch-controls.v1',
  tutorialVersion: 1,
  defaultMode: 'gestures',
  tapSlopPx: 12,
  minMoveStepPx: 18,
  moveStepCellRatio: 0.85,
  gestureDominance: 1.15,
  holdDistancePx: 50,
  softDropDistancePx: 24,
  softDropHoldMs: 150,
  softDropRepeatMs: 65,
  hardDropDistancePx: 64,
  hardDropMaxMs: 220,
  hardDropVelocityPxMs: 0.6,
  buttonRepeatDelayMs: 160,
  buttonMoveRepeatMs: 70,
  buttonSoftDropRepeatMs: 55,
  layoutGapPx: 8,
  hapticMs: 8,
};

// ---- Pantalla de victoria ----
const WIN_CONFIG = {
  video: 'assets/video/ganaste.mp4',
  music: 'assets/sound/ganaste.mp3',
  transitionMs: 2200,
};

// ---- Sonidos de juego ----
const SOUND_CONFIG = {
  lineClear: 'assets/sound/achi.flac',
  levelUp:   'assets/sound/vein.mp3',
  levelUp2:  'assets/sound/humiliation.mp3',
  monster:   'assets/sound/monsterkill.mp3',
  death:     'assets/sound/monkconv.mp3',
  defeatSong:'assets/sound/defeatsong.mp3',
};

// ---- Música aleatoria de los niveles ----
const LEVEL_MUSIC_POOL = [
  'assets/sound/enlabirrafest.mp3',
  'assets/sound/cacho.mp3',
  'assets/sound/elsemidios-rmx.mp3',
  'assets/sound/voysoloska.mp3',
];

// ---- Niveles (índice 0 = nivel 1) ----
// Campos de bg:
//   type      : 'image' | 'video'
//   src       : ruta del archivo
//   opacity   : opacidad sobre el tablero (0‒1)
//   tint      : capa de color encima (rgba), null para ninguna
//   loop      : (video) true para loop infinito
//   maxLoops  : (video) número de loops antes de pasar a nextVideo
//   nextVideo : (video) video que sigue al terminar maxLoops (muteado, loop)
//   nextAudio : (video) archivo de audio que suena junto a nextVideo (loop)
//   keepMusic : (video) true = reproducir música del nivel al mismo tiempo que el video
//
// Campo music:
//   'random' = elegir del repertorio, ruta = pista fija, null = sin música
//
// Campos de hud: colores del panel lateral durante ese nivel
const LEVELS = [
  {
    name:    'El Oveja',
    bg:      { type: 'image', src: 'assets/img/ovejo.png' },
    blockStyle: 'fire',
    opacity: 0.45,
    tint:    'rgba(20,10,0,0.15)',
    music:   'random',
    border:  ['#5a3a10', '#a07828'],
    grid:    'rgba(255,200,100,0.07)',
    hud:     { label:'#c8a050', value:'#ffe88c', panel:'rgba(60,35,5,0.5)', border:'#7a5520', title:'#ffcc44' },
  },
  {
    name:    'Mansero',
    bg:      { type: 'image', src: 'assets/img/mansagorda.webp' },
    blockStyle: 'neon',
    opacity: 0.40,
    tint:    'rgba(20,0,50,0.20)',
    music:   'random',
    border:  ['#3a1a6a', '#9a50ff'],
    grid:    'rgba(180,100,255,0.07)',
    hud:     { label:'#b878ff', value:'#e0b0ff', panel:'rgba(30,0,60,0.55)', border:'#7030c0', title:'#cc88ff' },
  },
  {
    name:    "Lince de las praderas",
    bg:      { type: 'video', src: 'assets/video/babydonthurtme.mp4', loop: true, muted: true },
    blockStyle: 'glossy',
    opacity: 0.38,
    tint:    null,
    music:   'assets/sound/mike.mp3',
    border:  ['#7a0050', '#ff40b0'],
    grid:    'rgba(255,80,180,0.08)',
    hud:     { label:'#ff70c0', value:'#ffe0f4', panel:'rgba(60,0,30,0.55)', border:'#cc2080', title:'#ff50b8' },
  },
  {
    name:    'Semidios',
    bg:      { type: 'image', src: 'assets/img/moxiprocer.webp' },
    blockStyle: 'metal',
    opacity: 0.30,
    tint:    'rgba(0,40,80,0.30)',
    music:   'random',
    border:  ['#003060', '#0090ff'],
    grid:    'rgba(0,150,255,0.08)',
    hud:     { label:'#50b8ff', value:'#c0e8ff', panel:'rgba(0,20,50,0.60)', border:'#0060c0', title:'#40a0ff' },
  },
  {
    name:    'Guillenada',
    bg:      { type: 'video', src: 'assets/video/guillenada.mp4', loop: true, muted: true },
    blockStyle: 'holo',
    opacity: 0.38,
    tint:    null,
    music:   'random',
    border:  ['#7a0050', '#ff40b0'],
    grid:    'rgba(255,80,180,0.08)',
    hud:     { label:'#ff70c0', value:'#ffe0f4', panel:'rgba(60,0,30,0.55)', border:'#cc2080', title:'#ff50b8' },
  },
  {
    name:    'Careta',
    musicVolume: 0.8,
    bg:      { type: 'video', src: 'assets/video/sacamelacaraguille.mp4', maxLoops: 2, keepMusic: true },
    blockStyle: 'psycho',
    opacity: 0.38,
    tint:    null,
    music:   'random',
    border:  ['#600000', '#ff3030'],
    grid:    'rgba(255,60,60,0.08)',
    hud:     { label:'#ff8080', value:'#ffe0e0', panel:'rgba(50,0,0,0.60)', border:'#c00000', title:'#ff4040' },
  },
];

// ---- Dificultades ----
const DIFFICULTIES = [
  { name: 'El Diávolo (fácil)',     short: 'Diávolo', fallDelay: 700, minDelay: 180, speedStep: 35 },
  { name: 'Chorizo Mezcla (medio)', short: 'Chorizo', fallDelay: 500, minDelay: 80,  speedStep: 40 },
  { name: 'Mansa Gorda (difícil)',  short: 'M.Gorda', fallDelay: 300, minDelay: 40,  speedStep: 50 },
];
