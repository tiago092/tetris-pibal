// ============================================================
//  TETRIS PIBAL — Configuración de assets y niveles
//  Editá este archivo para cambiar fondos, música y dificultad
//  sin tocar la lógica del juego (tetris.js).
// ============================================================

// ---- Menú principal ----
const MENU_CONFIG = {
  bg:    'assets/img/achitiago.png',
  music: 'assets/sound/intro.mp3',
};

// ---- Pantalla de victoria ----
const WIN_CONFIG = {
  video: 'assets/video/ganaste.mp4',
  music: 'assets/sound/ganaste.mp3',
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
// Campos de music:
//   src : ruta del mp3, null = sin música (usa audio del video)
//
// Campos de hud: colores del panel lateral durante ese nivel
const LEVELS = [
  {
    name:    'El Oveja',
    bg:      { type: 'image', src: 'assets/img/ovejo.png' },
    blockStyle: 'fire',
    opacity: 0.45,
    tint:    'rgba(20,10,0,0.15)',
    music:   'assets/sound/castro.mp3',
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
    music:   'assets/sound/cacho.mp3',
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
    music:   'assets/sound/elsemidios-rmx.mp3',
    border:  ['#003060', '#0090ff'],
    grid:    'rgba(0,150,255,0.08)',
    hud:     { label:'#50b8ff', value:'#c0e8ff', panel:'rgba(0,20,50,0.60)', border:'#0060c0', title:'#40a0ff' },
  },
  {
    name:    'Guillenada',
    bg:      { type: 'video', src: 'assets/video/guillenada.mp4', loop: true, muted: true,
               nextAudio: 'assets/video/festincumbia.mp4' },
    blockStyle: 'holo',
    opacity: 0.38,
    tint:    null,
    music:   null,
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
    music:   'assets/sound/voysoloska.mp3',
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
