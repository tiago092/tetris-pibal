// ---- Constantes ----
const COLS = 10, ROWS = 20, CS = 32, BV = 5;
const BX = 45, BY = 40;
const BW = COLS * CS, BH = ROWS * CS;
const W = 560, H = 720;
const FPS = 60;

const COLORS = {
  I:'#00e5ff', O:'#ffd600', T:'#d500f9',
  S:'#00e676', Z:'#ff1744', J:'#2979ff', L:'#ff6d00'
};
const PIECES = {
  I:[[[0,1],[1,1],[2,1],[3,1]],[[2,0],[2,1],[2,2],[2,3]]],
  O:[[[0,0],[1,0],[0,1],[1,1]]],
  T:[[[1,0],[0,1],[1,1],[2,1]],[[1,0],[1,1],[2,1],[1,2]],[[0,1],[1,1],[2,1],[1,2]],[[1,0],[0,1],[1,1],[1,2]]],
  S:[[[1,0],[2,0],[0,1],[1,1]],[[1,0],[1,1],[2,1],[2,2]]],
  Z:[[[0,0],[1,0],[1,1],[2,1]],[[2,0],[1,1],[2,1],[1,2]]],
  J:[[[0,0],[0,1],[1,1],[2,1]],[[1,0],[2,0],[1,1],[1,2]],[[0,1],[1,1],[2,1],[2,2]],[[1,0],[1,1],[0,2],[1,2]]],
  L:[[[2,0],[0,1],[1,1],[2,1]],[[1,0],[1,1],[1,2],[2,2]],[[0,1],[1,1],[2,1],[0,2]],[[0,0],[1,0],[1,1],[1,2]]]
};
const LINE_SCORES = {1:100,2:300,3:500,4:800};
const COMBO_COLORS = {2:'#64ff64',3:'#ff5050',4:'#ffdc00'};

// ---- Canvas setup ----
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
canvas.width = W; canvas.height = H;

function resizeCanvas() {
  const scaleX = window.innerWidth  / W;
  const scaleY = window.innerHeight / H;
  const scale  = Math.min(scaleX, scaleY);
  canvas.style.width  = Math.floor(W * scale) + 'px';
  canvas.style.height = Math.floor(H * scale) + 'px';
  // reposicionar el nameInput para que siga al canvas escalado
  const rect = canvas.getBoundingClientRect();
  nameInput.style.left = (rect.left + rect.width  / 2) + 'px';
  nameInput.style.top  = (rect.top  + rect.height * 0.565) + 'px';
}
window.addEventListener('resize', resizeCanvas);

// ---- Assets ----
function getTheme(level) { return LEVELS[Math.min(level, LEVELS.length-1)]; }

// offscreen cache for image-type backgrounds
let boardBgCache = {};
let currentBlockStyle = 'default';
function getBoardBg(level) {
  const theme = getTheme(level);
  if (theme.bg.type === 'video') return null; // video drawn directly each frame
  if (boardBgCache[level]) return boardBgCache[level];
  const img = new Image();
  img.src = theme.bg.src;
  const off = document.createElement('canvas');
  off.width = BW; off.height = BH;
  const oc = off.getContext('2d');
  function renderToOff() {
    oc.clearRect(0,0,BW,BH);
    oc.drawImage(img, 0, 0, BW, BH);
    if (theme.tint) { oc.fillStyle = theme.tint; oc.fillRect(0,0,BW,BH); }
    boardBgCache[level] = off;
  }
  if (img.complete && img.naturalWidth) {
    renderToOff();
  } else {
    oc.fillStyle = '#191932'; oc.fillRect(0,0,BW,BH);
    img.onload = () => { renderToOff(); boardBgCache[level] = off; };
  }
  boardBgCache[level] = off;
  return off;
}

// video element for video-background levels
const levelBgVideo = document.createElement('video');
levelBgVideo.loop = true;
levelBgVideo.muted = true;
levelBgVideo.playsInline = true;
levelBgVideo.style.display = 'none';
document.body.appendChild(levelBgVideo);

// audio secundario para niveles con festincumbia-style (video como fuente de audio)
const levelBgAudio = document.createElement('video');
levelBgAudio.muted = false;
levelBgAudio.loop = true;
levelBgAudio.playsInline = true;
levelBgAudio.style.display = 'none';
document.body.appendChild(levelBgAudio);

function stopLevelBgAudio() {
  levelBgAudio.pause();
  levelBgAudio.src = '';
}

function startLevelBgAudio(src) {
  levelBgAudio.src = src;
  levelBgAudio.currentTime = 0;
  levelBgAudio.play().catch(() => {});
}
let currentLevelBgSrc = '';

function startLevelBgVideo(src, loop=true, onEnded=null, maxLoops=null, onLoopsComplete=null) {
  if (currentLevelBgSrc === src) return;
  currentLevelBgSrc = src;
  levelBgVideo.loop = maxLoops ? false : loop;
  levelBgVideo.src = src;
  levelBgVideo.muted = false;  // puede sobreescribirse por el caller

  if (maxLoops) {
    let loopCount = 0;
    const onEach = () => {
      loopCount++;
      if (loopCount >= maxLoops) {
        levelBgVideo.removeEventListener('ended', onEach);
        if (onLoopsComplete) onLoopsComplete();
      } else {
        levelBgVideo.currentTime = 0;
        levelBgVideo.play().catch(() => {});
      }
    };
    levelBgVideo.addEventListener('ended', onEach);
  } else if (onEnded) {
    levelBgVideo.addEventListener('ended', onEnded, { once: true });
  }

  levelBgVideo.play().catch(() => { levelBgVideo.muted = true; levelBgVideo.play().catch(()=>{}); });
}
function stopLevelBgVideo() {
  if (!currentLevelBgSrc) return;
  currentLevelBgSrc = '';
  levelBgVideo.muted = true;
  levelBgVideo.pause();
  levelBgVideo.src = '';
  stopLevelBgAudio();
}

// ---- Video ganaste ----
const winVideo = document.createElement('video');
winVideo.loop = true;
winVideo.playsInline = true;
winVideo.style.display = 'none';
winVideo.src = WIN_CONFIG.video;
document.body.appendChild(winVideo);

// ---- Menú principal ----
const menuImg = new Image();
menuImg.src = MENU_CONFIG.bg;
const introMusic = new Audio(MENU_CONFIG.music);
introMusic.loop = true;
introMusic.volume = 0.7;

// ---- Dificultades ----
// ---- Leaderboard ----
const SUPA_URL = 'https://ucnaukurijvlmxgofhmv.supabase.co/rest/v1';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjbmF1a3VyaWp2bG14Z29maG12Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MzgxMDQsImV4cCI6MjA5NDMxNDEwNH0.IZmwY81Gm_zRYWiuw0-1eTAcIh0h7-q4W5ZIDAuFml0';

let cachedScores = null;
let geoInfo = null;

async function fetchGeoInfo() {
  if (geoInfo) return geoInfo;
  try {
    const res = await fetch('https://ipapi.co/json/');
    if (!res.ok) throw new Error();
    const d = await res.json();
    geoInfo = { country: d.country_name || '', city: d.city || '' };
  } catch {
    geoInfo = { country: '', city: '' };
  }
  return geoInfo;
}

function getDeviceType() {
  return /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
}

async function fetchScoresFromSupabase() {
  try {
    const res = await fetch(`${SUPA_URL}/scores?order=score.desc&limit=10`, {
      headers: { 'apikey': SUPA_KEY, 'Authorization': `Bearer ${SUPA_KEY}` }
    });
    if (!res.ok) throw new Error('fetch failed');
    const data = await res.json();
    const scores = data.map(r => ({
      name: r.name, score: r.score, diff: r.diff || '',
      level: r.level || 1, won: r.won || false, date: r.created_at ? new Date(r.created_at).toLocaleDateString() : ''
    }));
    cachedScores = scores;
    localStorage.setItem('tetrispibal_scores', JSON.stringify(scores));
    return scores;
  } catch {
    return null;
  }
}

function loadScores() {
  try { return JSON.parse(localStorage.getItem('tetrispibal_scores') || '[]'); }
  catch { return []; }
}

async function saveScoreToSupabase(entry) {
  try {
    const geo = await fetchGeoInfo();
    await fetch(`${SUPA_URL}/scores`, {
      method: 'POST',
      headers: {
        'apikey': SUPA_KEY,
        'Authorization': `Bearer ${SUPA_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        name: entry.name, score: entry.score, diff: entry.diff,
        level: entry.level, won: entry.won,
        country: geo.country, city: geo.city, device: getDeviceType()
      })
    });
    cachedScores = null;
  } catch { /* falla silenciosamente, el score ya se guardó en localStorage */ }
}

function saveScore(entry) {
  const scores = loadScores();
  scores.push(entry);
  scores.sort((a,b) => b.score - a.score);
  localStorage.setItem('tetrispibal_scores', JSON.stringify(scores.slice(0, 10)));
  saveScoreToSupabase(entry);
}

// Pre-cargar scores y geo al iniciar
fetchScoresFromSupabase();
fetchGeoInfo();

// ---- Shake ----
let shake = { intensity: 0, duration: 0, elapsed: 0 };

function triggerShake(intensity=10, duration=600) {
  shake.intensity = intensity;
  shake.duration = duration;
  shake.elapsed = 0;
}

function getShakeOffset(dt) {
  if (shake.elapsed >= shake.duration) return [0, 0];
  shake.elapsed += dt;
  const t = shake.elapsed / shake.duration;
  const decay = Math.pow(1 - t, 2);
  const mag = shake.intensity * decay;
  return [
    (Math.random()*2-1) * mag,
    (Math.random()*2-1) * mag,
  ];
}

// ---- Estado global de flujo ----
let inMenu       = true;
let inNameEntry  = false;
let inDifficulty = false;
let inLeaderboard = false;
let inCredits     = false;
let inCountdown  = false;
let countdownVal = 5;
let countdownStart = 0;
let menuOption   = 0; // 0=Jugar, 1=Ranking
const MENU_OPTIONS = ['JUGAR', 'VER RANKING', 'CRÉDITOS'];
let menuUnlocked = false;
let menuPulse    = 0;
let diffSelected = 1;        // índice por defecto: Chorizo Mezcla
let playerName   = '';
let currentDiff  = DIFFICULTIES[1];

// ---- Input HTML para nombre ----
const nameInput = document.createElement('input');
nameInput.type = 'text';
nameInput.maxLength = 16;
nameInput.placeholder = 'Tu nombre...';
Object.assign(nameInput.style, {
  position:'absolute', left:'50%', top:'52%',
  transform:'translate(-50%,-50%)',
  background:'rgba(20,20,45,0.82)',
  color:'#ffffff',
  border:'2px solid rgba(180,180,255,0.6)',
  borderRadius:'10px',
  padding:'10px 18px', fontSize:'22px', fontFamily:'monospace',
  textAlign:'center', outline:'none', display:'none', zIndex:'10',
  width:'260px',
  boxShadow:'0 0 18px rgba(100,120,255,0.35), inset 0 1px 0 rgba(255,255,255,0.15)',
  caretColor:'#ffe600',
});
document.body.appendChild(nameInput);
resizeCanvas();

function drawMenuBg() {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  if (menuImg.complete && menuImg.naturalWidth) {
    ctx.save();
    ctx.filter = 'brightness(0.80) saturate(1.6) contrast(1.05)';
    ctx.drawImage(menuImg, 0, 0, W, H);
    ctx.filter = 'none';
    ctx.restore();
    const vig = ctx.createRadialGradient(W/2, H/2, H*0.2, W/2, H/2, H*0.95);
    vig.addColorStop(0, 'rgba(0,0,0,0.15)');
    vig.addColorStop(1, 'rgba(0,0,0,0.68)');
    ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);
    // overlay oscuro uniforme para consistencia entre pantallas
    ctx.fillStyle = 'rgba(0,0,10,0.38)'; ctx.fillRect(0, 0, W, H);
  }
}

function drawCountdownBg() {
  if (menuImg.complete && menuImg.naturalWidth) {
    ctx.save();
    ctx.filter = 'brightness(0.65) saturate(1.5) contrast(1.05)';
    ctx.drawImage(menuImg, 0, 0, W, H);
    ctx.filter = 'none';
    ctx.restore();
    const vig = ctx.createRadialGradient(W/2, H/2, H*0.05, W/2, H/2, H*0.75);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);
  }
}

// Colores del logo clásico de Tetris: rojo, naranja, amarillo, verde, cian, azul, violeta
const TETRIS_LETTER_COLORS = [
  { top:'#ff4444', mid:'#cc0000', bot:'#880000' },
  { top:'#ff9900', mid:'#cc6600', bot:'#884400' },
  { top:'#ffee00', mid:'#ccaa00', bot:'#887700' },
  { top:'#44ee44', mid:'#00aa00', bot:'#006600' },
  { top:'#00ccff', mid:'#0088cc', bot:'#005588' },
  { top:'#4488ff', mid:'#0044cc', bot:'#002288' },
  { top:'#cc44ff', mid:'#8800cc', bot:'#550088' },
];

function drawBrickTitle(text, x, y, fontSize=52, bold=true) {
  const font = `${bold?'bold ':''}${fontSize}px monospace`;
  ctx.save();
  ctx.font = font;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  // medir ancho total para centrar
  const letters = text.split('').filter(c => c !== ' ');
  const spacing = fontSize * 0.06; // kerning extra
  const widths = text.split('').map(c => ctx.measureText(c).width + spacing);
  const totalW = widths.reduce((a, b) => a + b, 0);
  let cx = x - totalW / 2;

  text.split('').forEach((ch, i) => {
    const lw = widths[i];
    const lx = cx + lw / 2;
    const colorIdx = letters.indexOf(ch) >= 0
      ? (text.split('').filter((c,j) => c !== ' ' && j <= i).length - 1) % TETRIS_LETTER_COLORS.length
      : 0;
    const col = TETRIS_LETTER_COLORS[colorIdx % TETRIS_LETTER_COLORS.length];

    if (ch === ' ') { cx += lw; return; }

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = font;

    // sombra difusa global
    ctx.shadowColor = 'rgba(0,0,0,0.95)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillText(ch, lx, y);
    ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;

    // sombra 3D abajo-derecha
    for (let s = 10; s > 0; s--) {
      ctx.fillStyle = `rgba(0,0,0,${0.6 - s * 0.05})`;
      ctx.fillText(ch, lx + s, y + s);
    }

    // contorno negro grueso
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 11;
    ctx.lineJoin = 'round';
    ctx.strokeText(ch, lx, y);

    // relleno principal con gradiente vertical
    const th = fontSize;
    const grad = ctx.createLinearGradient(lx, y - th/2, lx, y + th/2);
    grad.addColorStop(0.0, col.top);
    grad.addColorStop(0.45, col.mid);
    grad.addColorStop(1.0, col.bot);
    // glow del color de la letra (dos pasadas: difuso + apretado)
    ctx.shadowColor = col.top; ctx.shadowBlur = 28;
    ctx.fillStyle = grad; ctx.fillText(ch, lx, y);
    ctx.shadowBlur = 12;
    ctx.fillText(ch, lx, y);
    ctx.shadowBlur = 0;
    ctx.fillText(ch, lx, y);

    // borde lateral derecho más oscuro (efecto volumen)
    ctx.strokeStyle = col.bot;
    ctx.lineWidth = 2;
    ctx.strokeText(ch, lx + 1, y + 1);

    // gloss: reflejo blanco en la parte superior (~40% de la altura)
    const gloss = ctx.createLinearGradient(lx, y - th/2, lx, y - th/2 + th * 0.42);
    gloss.addColorStop(0,   'rgba(255,255,255,0.90)');
    gloss.addColorStop(0.5, 'rgba(255,255,255,0.40)');
    gloss.addColorStop(1,   'rgba(255,255,255,0)');
    ctx.fillStyle = gloss;
    ctx.fillText(ch, lx, y);

    ctx.restore();
    cx += lw;
  });

  ctx.restore();
}

function drawGoldTitle(text, x, y, fontSize=52, bold=true) {
  const font = `${bold?'bold ':''}${fontSize}px monospace`;
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = font;

  // capa de profundidad (sombra 3D)
  for (let i = 10; i > 0; i--) {
    ctx.fillStyle = `rgba(80,40,0,${0.6 - i*0.04})`;
    ctx.fillText(text, x + i, y + i);
  }

  // contorno negro grueso
  ctx.strokeStyle = 'rgba(0,0,0,0.9)';
  ctx.lineWidth = 6;
  ctx.lineJoin = 'round';
  ctx.strokeText(text, x, y);

  // gradiente dorado vertical
  const metrics = ctx.measureText(text);
  const tw = metrics.width, th = fontSize;
  const grad = ctx.createLinearGradient(x, y - th/2, x, y + th/2);
  grad.addColorStop(0.0,  '#fff8c0');
  grad.addColorStop(0.25, '#ffe033');
  grad.addColorStop(0.5,  '#ffb800');
  grad.addColorStop(0.75, '#cc7a00');
  grad.addColorStop(1.0,  '#ffd700');
  ctx.fillStyle = grad;
  ctx.fillText(text, x, y);

  // destello blanco fino en la parte alta
  const shine = ctx.createLinearGradient(x, y - th/2, x, y - th/2 + th*0.35);
  shine.addColorStop(0, 'rgba(255,255,255,0.55)');
  shine.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = shine;
  ctx.fillText(text, x, y);

  ctx.restore();
}

function drawGlowText(text, x, y, font, color, glowColor, glowBlur=18) {
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = font;
  ctx.shadowColor = glowColor; ctx.shadowBlur = glowBlur;
  ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 3; ctx.lineJoin = 'round';
  ctx.strokeText(text, x, y);
  ctx.shadowBlur = glowBlur;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawHint(text, y, alpha=0.8) {
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = `rgba(180,190,255,${alpha})`;
  ctx.font = '20px monospace';
  ctx.shadowColor = `rgba(100,120,255,${alpha * 0.6})`; ctx.shadowBlur = 8;
  ctx.fillText(text, W/2, y);
  ctx.restore();
}

function drawMuteIndicator() {
  const icon = musicMuted ? '🔇' : '🔊';
  const label = musicMuted ? 'SIN SONIDO' : 'MÚSICA';
  ctx.save();
  ctx.textAlign = 'right'; ctx.textBaseline = 'top';
  ctx.font = 'bold 14px monospace';
  ctx.fillStyle = musicMuted ? 'rgba(255,100,100,0.9)' : 'rgba(180,255,180,0.85)';
  ctx.shadowColor = musicMuted ? 'rgba(255,0,0,0.4)' : 'rgba(0,255,0,0.3)';
  ctx.shadowBlur = 8;
  ctx.fillText(`${icon} ${label}  [M]`, W - 10, 10);
  ctx.restore();
}

// Botón metálico oscuro
function drawMenuBtn(x, y, w, h, label, selected) {
  const r = 12;
  ctx.save();

  // sombra exterior
  ctx.shadowColor = selected ? 'rgba(255,220,0,0.45)' : 'rgba(0,0,0,0.6)';
  ctx.shadowBlur   = selected ? 18 : 8;
  ctx.shadowOffsetY = 2;

  // cuerpo: gradiente metálico oscuro
  const g = ctx.createLinearGradient(x, y, x, y + h);
  if (selected) {
    g.addColorStop(0,    'rgba(110,85,10,0.65)');
    g.addColorStop(0.45, 'rgba(70,50,5,0.65)');
    g.addColorStop(1,    'rgba(40,28,0,0.65)');
  } else {
    g.addColorStop(0,    'rgba(70,70,90,0.55)');
    g.addColorStop(0.45, 'rgba(40,40,60,0.55)');
    g.addColorStop(1,    'rgba(20,20,35,0.55)');
  }
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = g; ctx.fill();
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

  // borde metálico: línea superior clara + borde exterior
  ctx.save();
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.clip();
  // reflejo metálico diagonal
  const shine = ctx.createLinearGradient(x, y, x + w * 0.6, y + h);
  shine.addColorStop(0,    'rgba(255,255,255,0.18)');
  shine.addColorStop(0.35, 'rgba(255,255,255,0.06)');
  shine.addColorStop(0.36, 'rgba(255,255,255,0.13)');
  shine.addColorStop(1,    'rgba(255,255,255,0.02)');
  ctx.fillStyle = shine; ctx.fillRect(x, y, w, h);
  // línea de brillo superior
  ctx.fillStyle = selected ? 'rgba(255,220,80,0.35)' : 'rgba(255,255,255,0.22)';
  ctx.fillRect(x + r, y + 1, w - r * 2, 2);
  ctx.restore();

  // borde exterior
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
  ctx.strokeStyle = selected ? '#ffe600' : 'rgba(180,180,210,0.55)';
  ctx.lineWidth   = selected ? 2 : 1.5;
  ctx.stroke();

  // texto
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = selected ? 'bold 23px monospace' : 'bold 20px monospace';
  if (selected) {
    ctx.shadowColor = 'rgba(255,200,0,0.8)'; ctx.shadowBlur = 12;
    ctx.fillStyle = '#ffe600';
  } else {
    ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 4;
    ctx.fillStyle = '#ddddf5';
  }
  ctx.fillText(label, x + w / 2, y + h / 2);

  ctx.restore();
}

// Panel de fondo metálico oscuro (para sub-menús)
function drawWarmPanel(x, y, w, h) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 20;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 14);
  const pg = ctx.createLinearGradient(x, y, x, y + h);
  pg.addColorStop(0, 'rgba(60,60,80,0.60)');
  pg.addColorStop(1, 'rgba(20,20,36,0.60)');
  ctx.fillStyle = pg; ctx.fill();
  ctx.shadowBlur = 0;
  // brillo diagonal metálico
  ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, w, h, 14); ctx.clip();
  const ms = ctx.createLinearGradient(x, y, x + w, y + h * 0.6);
  ms.addColorStop(0,    'rgba(255,255,255,0.10)');
  ms.addColorStop(0.5,  'rgba(255,255,255,0.03)');
  ms.addColorStop(0.51, 'rgba(255,255,255,0.08)');
  ms.addColorStop(1,    'rgba(255,255,255,0.01)');
  ctx.fillStyle = ms; ctx.fillRect(x, y, w, h);
  // línea superior brillante
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(x + 14, y + 1, w - 28, 2);
  ctx.restore();
  // borde
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 14);
  ctx.strokeStyle = 'rgba(200,200,230,0.45)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.restore();
}

function drawMenuPanel(x, y, w, h, selected) {
  drawMenuBtn(x, y, w, h, '', selected);
}

let menuEnterTime = 0;  // timestamp cuando se desbloquea el menú

// easing: caída con rebote
function easeOutBounce(t) {
  if (t < 1/2.75)      return 7.5625*t*t;
  if (t < 2/2.75)      { t -= 1.5/2.75;   return 7.5625*t*t + 0.75; }
  if (t < 2.5/2.75)    { t -= 2.25/2.75;  return 7.5625*t*t + 0.9375; }
                         t -= 2.625/2.75;  return 7.5625*t*t + 0.984375;
}

function drawSideFrames(alpha) {
  if (alpha <= 0) return;
  const frameW = 26, frameR = 3;
  ctx.save();
  ctx.globalAlpha = alpha * 0.95;

  for (const fx of [0, W - frameW]) {
    // fondo base: acero oscuro
    ctx.beginPath(); ctx.roundRect(fx, 0, frameW, H, frameR);
    const base = ctx.createLinearGradient(fx, 0, fx + frameW, 0);
    base.addColorStop(0,   '#1a1a1e');
    base.addColorStop(0.4, '#2a2a30');
    base.addColorStop(0.7, '#222226');
    base.addColorStop(1,   '#181818');
    ctx.fillStyle = base; ctx.fill();

    // cota de malla: anillos entrelazados
    ctx.save(); ctx.beginPath(); ctx.roundRect(fx, 0, frameW, H, frameR); ctx.clip();

    const rW = 16, rH = 10, cols = Math.ceil(frameW / rW) + 1;
    const rows = Math.ceil(H / rH) + 2;

    for (let row = -1; row < rows; row++) {
      const offsetX = (row % 2 === 0) ? 0 : rW / 2;
      for (let col = -1; col < cols; col++) {
        const cx3 = fx + col * rW + offsetX;
        const cy3 = row * rH;

        // sombra del anillo (profundidad)
        ctx.beginPath();
        ctx.ellipse(cx3 + 0.5, cy3 + 1, rW / 2 - 0.5, rH / 2 - 0.5, 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0,0,0,0.65)';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // anillo principal: gradiente gris metálico
        const ringGrad = ctx.createLinearGradient(cx3 - rW/2, cy3 - rH/2, cx3 + rW/2, cy3 + rH/2);
        ringGrad.addColorStop(0,   'rgba(210,215,220,0.90)');
        ringGrad.addColorStop(0.4, 'rgba(130,138,145,0.80)');
        ringGrad.addColorStop(0.7, 'rgba(85,90,96,0.85)');
        ringGrad.addColorStop(1,   'rgba(175,182,188,0.75)');
        ctx.beginPath();
        ctx.ellipse(cx3, cy3, rW / 2 - 0.5, rH / 2 - 0.5, 0, 0, Math.PI * 2);
        ctx.strokeStyle = ringGrad;
        ctx.lineWidth = 2.2;
        ctx.stroke();

        // reflejo superior del anillo
        ctx.beginPath();
        ctx.ellipse(cx3, cy3 - rH * 0.12, rW / 2 - 2.5, rH / 2 - 2.5, 0, Math.PI, Math.PI * 2);
        ctx.strokeStyle = 'rgba(240,245,250,0.50)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
    }
    ctx.restore();

    // velo lateral: gradiente de oscurecimiento hacia el borde exterior
    ctx.save(); ctx.beginPath(); ctx.roundRect(fx, 0, frameW, H, frameR); ctx.clip();
    const veil = ctx.createLinearGradient(fx, 0, fx + frameW, 0);
    const dark = 'rgba(0,0,0,0.45)', clear = 'rgba(0,0,0,0.00)';
    if (fx === 0) { veil.addColorStop(0, dark); veil.addColorStop(0.5, clear); veil.addColorStop(1, clear); }
    else          { veil.addColorStop(0, clear); veil.addColorStop(0.5, clear); veil.addColorStop(1, dark); }
    ctx.fillStyle = veil; ctx.fillRect(fx, 0, frameW, H);
    ctx.restore();

    // borde exterior: filo metálico triple
    ctx.save();
    ctx.beginPath(); ctx.roundRect(fx + 0.5, 0.5, frameW - 1, H - 1, frameR);
    ctx.strokeStyle = 'rgba(15,15,18,0.95)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath(); ctx.roundRect(fx + 2, 2, frameW - 4, H - 4, frameR);
    ctx.strokeStyle = 'rgba(190,195,200,0.35)'; ctx.lineWidth = 0.75; ctx.stroke();
    ctx.beginPath(); ctx.roundRect(fx + 3, 3, frameW - 6, H - 6, frameR);
    ctx.strokeStyle = 'rgba(10,10,12,0.40)'; ctx.lineWidth = 0.5; ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function drawTitleBox(y, fontSize, alpha=1) {
  const tbW = 460, tbH = fontSize * 1.65, tbX = W/2 - tbW/2, tbY = y - tbH/2 - 2;
  ctx.save();
  ctx.globalAlpha = alpha * 0.88;
  const tbGrad = ctx.createLinearGradient(tbX, tbY, tbX, tbY + tbH);
  tbGrad.addColorStop(0,   'rgba(45,47,52,0.88)');
  tbGrad.addColorStop(0.5, 'rgba(60,62,68,0.84)');
  tbGrad.addColorStop(1,   'rgba(45,47,52,0.88)');
  ctx.fillStyle = tbGrad;
  ctx.beginPath(); ctx.roundRect(tbX, tbY, tbW, tbH, 8); ctx.fill();
  // borde gris claro
  const tbBorder = ctx.createLinearGradient(tbX, tbY, tbX + tbW, tbY);
  tbBorder.addColorStop(0,   'rgba(180,180,190,0.30)');
  tbBorder.addColorStop(0.3, 'rgba(220,220,230,0.80)');
  tbBorder.addColorStop(0.7, 'rgba(220,220,230,0.80)');
  tbBorder.addColorStop(1,   'rgba(180,180,190,0.30)');
  ctx.strokeStyle = tbBorder; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(tbX, tbY, tbW, tbH, 8); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(tbX + 3, tbY + 3, tbW - 6, tbH - 6, 6); ctx.stroke();
  ctx.restore();
}

function drawMenu(now) {
  drawMenuBg();

  if (!menuUnlocked) {
    // título estático antes de desbloquear
    drawTitleBox(110, 52);
    drawBrickTitle('TETRIS PIBAL', W/2, 110, 52);
    menuPulse += 0.04;
    const a = 0.55 + 0.45 * Math.sin(menuPulse);
    ctx.save();
    ctx.globalAlpha = a;
    drawGlowText('PRESIONA TECLA CUALQUIERA', W/2, H/2, 'bold 24px monospace', '#e0e8ff', 'rgba(100,140,255,0.8)', 20);
    ctx.restore();
    return;
  }

  // animación de entrada: 900ms total
  const ANIM_DUR = 900;
  const age = now - menuEnterTime;
  const titleT  = Math.min(1, age / ANIM_DUR);
  const titleY  = -80 + (110 + 80) * easeOutBounce(titleT);  // cae desde arriba

  drawTitleBox(titleY, 52, titleT);
  drawBrickTitle('TETRIS PIBAL', W/2, titleY, 52);

  // marcos laterales de madera
  drawSideFrames(Math.min(1, (age - 100) / 600));

  // opciones sin caja: solo texto con glow
  menuPulse += 0.04;
  MENU_OPTIONS.forEach((opt, i) => {
    const cyBase = H * 0.47 + i * 62;
    const btnDelay = 200 + i * 120;
    const btnT = Math.min(1, Math.max(0, (age - btnDelay) / 500));
    const slideEase = 1 - Math.pow(1 - btnT, 3);
    const cy = cyBase + (1 - slideEase) * 70;
    const sel = i === menuOption;

    ctx.save();
    ctx.globalAlpha = slideEase;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

    if (sel) {
      const sc = 1 + 0.04 * Math.sin(menuPulse * 2);
      ctx.translate(W/2, cy); ctx.scale(sc, sc); ctx.translate(-W/2, -cy);
      // sombra negra gruesa de fondo
      ctx.shadowColor = 'rgba(0,0,0,1)'; ctx.shadowBlur = 22; ctx.shadowOffsetX = 3; ctx.shadowOffsetY = 5;
      ctx.font = 'bold 27px monospace'; ctx.fillStyle = '#ffe600';
      ctx.fillText(opt, W/2, cy);
      // glow dorado
      ctx.shadowColor = 'rgba(255,180,0,0.95)'; ctx.shadowBlur = 36; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
      ctx.fillText(opt, W/2, cy);
      ctx.shadowBlur = 14;
      ctx.fillText(opt, W/2, cy);
      ctx.shadowBlur = 0;
      // flechas
      ctx.fillStyle = 'rgba(255,220,0,0.85)'; ctx.font = 'bold 18px monospace';
      ctx.fillText('▶', W/2 - 130, cy);
      ctx.fillText('◀', W/2 + 130, cy);
    } else {
      // sombra negra fuerte
      ctx.shadowColor = 'rgba(0,0,0,1)'; ctx.shadowBlur = 18; ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 4;
      ctx.font = 'bold 22px monospace'; ctx.fillStyle = '#dde0ff';
      ctx.fillText(opt, W/2, cy);
      ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; ctx.shadowBlur = 0;
    }
    ctx.restore();
  });

  drawHint('↑ ↓ navegar   ENTER confirmar', H - 30, 1.0);
  drawMuteIndicator();
}

function drawNameEntry() {
  drawMenuBg();
  drawSideFrames(1);
  drawTitleBox(H*0.16, 52);
  drawBrickTitle('TETRIS PIBAL', W/2, H*0.16, 52);

  // panel cálido
  const panW = 320, panH = 140, panX = W/2 - panW/2, panY = H*0.43;
  drawWarmPanel(panX, panY, panW, panH);

  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 20px monospace'; ctx.fillStyle = '#c8d8ff';
  ctx.fillText('INGRESÁ TU NOMBRE', W/2, panY + 28);
  ctx.restore();

  drawHint('ENTER confirmar   ESC volver', H*0.82);
  drawMuteIndicator();
}

function drawDifficulty() {
  drawMenuBg();
  drawSideFrames(1);
  drawBrickTitle('DIFICULTAD', W/2, H*0.15, 38, false);

  // jugador
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 2;
  ctx.font = 'bold 15px monospace'; ctx.fillStyle = '#c8d8ff';
  ctx.fillText(`Jugador: ${playerName}`, W/2, H*0.34);
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.restore();

  menuPulse += 0.04;
  DIFFICULTIES.forEach((d, i) => {
    const cy = H * 0.46 + i * 62;
    const sel = i === diffSelected;
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (sel) {
      const sc = 1 + 0.04 * Math.sin(menuPulse * 2);
      ctx.translate(W/2, cy); ctx.scale(sc, sc); ctx.translate(-W/2, -cy);
      ctx.shadowColor = 'rgba(255,180,0,0.85)'; ctx.shadowBlur = 28;
      ctx.font = 'bold 27px monospace'; ctx.fillStyle = '#ffe600';
      ctx.fillText(d.name, W/2, cy);
      ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
      ctx.fillText(d.name, W/2, cy);
      ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
      // medir a 27px (fuente real del texto) antes del scale
      ctx.font = 'bold 27px monospace';
      const halfTW = ctx.measureText(d.name).width / 2;
      ctx.font = 'bold 18px monospace';
      ctx.fillStyle = 'rgba(255,220,0,0.85)';
      ctx.fillText('▶', W/2 - halfTW - 20, cy);
      ctx.fillText('◀', W/2 + halfTW + 20, cy);
    } else {
      ctx.shadowColor = 'rgba(0,0,0,0.95)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 3;
      ctx.font = 'bold 22px monospace'; ctx.fillStyle = '#dde0ff';
      ctx.fillText(d.name, W/2, cy);
      ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    }
    ctx.restore();
  });

  drawHint('↑ ↓ elegir   ENTER jugar   ESC volver', H*0.91);
  drawMuteIndicator();
}

function drawCountdown(now) {
  drawCountdownBg();

  const elapsed = now - countdownStart;
  const step = Math.floor(elapsed / 1000);
  countdownVal = 5 - step;

  if (countdownVal <= 0) { inCountdown = false; return; }

  const frac  = (elapsed % 1000) / 1000;
  const scale = 1.2 - frac * 0.35;
  const alpha = (frac < 0.6 ? 1 : 1 - (frac - 0.6) / 0.4) * 0.82;
  const sz    = Math.round(90 * scale);

  const palettes = [
    null,
    { mid:'#ff6666', glow:'rgba(255,60,60,0.5)',  ring:'rgba(255,80,80,0.7)'  },
    { mid:'#ffbb44', glow:'rgba(255,160,0,0.5)',  ring:'rgba(255,180,0,0.7)'  },
    { mid:'#66ffaa', glow:'rgba(0,220,100,0.5)',  ring:'rgba(50,220,120,0.7)' },
    { mid:'#88ccff', glow:'rgba(80,160,255,0.5)', ring:'rgba(100,180,255,0.7)' },
    { mid:'#ee88ff', glow:'rgba(200,80,255,0.5)', ring:'rgba(210,100,255,0.7)' },
  ];
  const pal = palettes[Math.min(countdownVal, palettes.length - 1)];
  const cx = W/2, cy = H/2;

  // anillo fino
  ctx.save();
  ctx.globalAlpha = alpha * 0.7;
  const ringR = 72;
  const arcEnd = -Math.PI/2 + (1 - frac) * Math.PI * 2;
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.beginPath(); ctx.arc(cx, cy, ringR, 0, Math.PI*2); ctx.stroke();
  ctx.shadowColor = pal.glow; ctx.shadowBlur = 12;
  ctx.strokeStyle = pal.ring;
  ctx.beginPath(); ctx.arc(cx, cy, ringR, -Math.PI/2, arcEnd); ctx.stroke();
  ctx.restore();

  // número con efecto 3D y glow
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `bold ${sz}px monospace`;
  ctx.lineJoin = 'round';
  // sombra 3D profunda
  for (let i = 10; i > 0; i--) {
    ctx.fillStyle = `rgba(0,0,0,${0.5 - i * 0.04})`;
    ctx.fillText(String(countdownVal), cx + i, cy + i);
  }
  // contorno negro grueso
  ctx.strokeStyle = 'rgba(0,0,0,0.95)'; ctx.lineWidth = 10;
  ctx.strokeText(String(countdownVal), cx, cy);
  // glow del color
  ctx.shadowColor = pal.glow; ctx.shadowBlur = 35;
  ctx.fillStyle = pal.mid;
  ctx.fillText(String(countdownVal), cx, cy);
  ctx.shadowBlur = 14;
  ctx.fillText(String(countdownVal), cx, cy);
  ctx.shadowBlur = 0;
  // gloss superior
  const glossG = ctx.createLinearGradient(cx, cy - sz/2, cx, cy);
  glossG.addColorStop(0, 'rgba(255,255,255,0.75)');
  glossG.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glossG;
  ctx.fillText(String(countdownVal), cx, cy);
  ctx.restore();

  // jugador y dificultad
  ctx.save();
  ctx.globalAlpha = 0.75;
  drawGlowText(`${playerName}  ·  ${currentDiff.name}`, W/2, H*0.72, '15px monospace', '#e0e8ff', 'rgba(100,140,255,0.6)', 8);
  ctx.restore();
  drawHint('preparate...', H*0.80);
}

function drawScoreTable(scores, tableTop, maxRows=8) {
  const pad = 28, rowH = 50, tableW = W - pad*2;
  const cols = [pad+10, pad+55, pad+240, pad+360];
  const medals = ['🥇','🥈','🥉'];

  // panel de fondo cálido
  drawWarmPanel(pad, tableTop, tableW, rowH * maxRows + 46);

  // cabecera metálica
  ctx.save();
  const hg = ctx.createLinearGradient(pad, tableTop, pad, tableTop+44);
  hg.addColorStop(0, 'rgba(90,90,130,0.98)');
  hg.addColorStop(1, 'rgba(40,40,70,0.98)');
  ctx.fillStyle = hg;
  ctx.beginPath(); ctx.roundRect(pad, tableTop, tableW, 44, [14,14,0,0]); ctx.fill();
  ctx.fillStyle = '#e0e8ff'; ctx.font = 'bold 13px monospace';
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  [['#',cols[0]],['Nombre',cols[1]],['Score',cols[2]],['Dificultad',cols[3]]].forEach(([h,x])=>ctx.fillText(h,x,tableTop+22));
  ctx.strokeStyle = 'rgba(160,140,255,0.7)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(pad,tableTop+44); ctx.lineTo(pad+tableW,tableTop+44); ctx.stroke();
  ctx.restore();

  if (scores.length === 0) {
    ctx.save();
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillStyle='#aaaadd'; ctx.font='15px monospace';
    ctx.fillText('— aún no hay puntajes —', W/2, tableTop + rowH*2);
    ctx.restore();
    return;
  }

  scores.slice(0, maxRows).forEach((s, i) => {
    const rowY = tableTop + 44 + i * rowH;
    const cy = rowY + rowH/2;
    const isNew = s._new;
    ctx.save();
    ctx.fillStyle = isNew ? 'rgba(255,230,0,0.13)' : i%2===0 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.18)';
    ctx.fillRect(pad+1, rowY, tableW-2, rowH);
    if (isNew) {
      ctx.strokeStyle='rgba(255,220,0,0.8)'; ctx.lineWidth=1.5;
      ctx.strokeRect(pad+1, rowY, tableW-2, rowH);
    }
    ctx.strokeStyle='rgba(255,255,255,0.07)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(pad+1,rowY+rowH); ctx.lineTo(pad+tableW-1,rowY+rowH); ctx.stroke();

    const rankColor = isNew?'#ffe600':i===0?'#ffd700':i===1?'#e8e8e8':i===2?'#e8a060':'#c0c8ff';
    ctx.textBaseline='middle'; ctx.textAlign='left';
    ctx.fillStyle=rankColor; ctx.font='bold 14px monospace';
    ctx.fillText(i<3 ? medals[i] : `${i+1}`, cols[0], cy);
    ctx.fillStyle=isNew?'#ffe600':'#ffffff'; ctx.font=`${isNew?'bold ':''}13px monospace`;
    ctx.fillText(s.name.substring(0,14), cols[1], cy);
    ctx.fillStyle=rankColor; ctx.font='bold 13px monospace';
    ctx.fillText(s.score.toLocaleString(), cols[2], cy);
    ctx.fillStyle='#aaccff'; ctx.font='11px monospace';
    ctx.fillText(s.diff, cols[3], cy);
    ctx.restore();
  });
}

let leaderboardRefreshing = false;
function drawLeaderboard() {
  drawMenuBg();
  drawSideFrames(1);
  drawGoldTitle('RANKING', W/2, 62, 40, false);
  if (!leaderboardRefreshing) {
    leaderboardRefreshing = true;
    fetchScoresFromSupabase().then(() => { leaderboardRefreshing = false; });
  }
  drawScoreTable(loadScores(), 108, 8);
  menuPulse += 0.04;
  ctx.save();
  ctx.globalAlpha = 0.5 + 0.5*Math.sin(menuPulse);
  drawHint('ENTER / ESC para volver', H - 28);
  ctx.restore();
  drawMuteIndicator();
}

function drawCredits() {
  drawMenuBg();
  drawSideFrames(1);
  drawTitleBox(72, 42);
  drawBrickTitle('TETRIS PIBAL', W/2, 72, 42, false);

  const panW = 340, panH = 330, panX = W/2 - panW/2, panY = 140;
  drawWarmPanel(panX, panY, panW, panH);

  const lines = [
    { text: 'CREADO POR',          style: 'label' },
    { text: 'Turcovein',           style: 'name'  },
    { text: '',                    style: 'gap'   },
    { text: 'DESARROLLADO CON',    style: 'label' },
    { text: 'Claude (Anthropic)',  style: 'value' },
    { text: '',                    style: 'gap'   },
    { text: 'ASSETS',              style: 'label' },
    { text: 'Imágenes y videos',   style: 'value' },
    { text: 'por Turcovein',       style: 'value' },
    { text: '',                    style: 'gap'   },
    { text: '¡Gracias pibe por jugar!', style: 'thanks'},
  ];

  let y = panY + 44;
  for (const { text, style } of lines) {
    if (style === 'gap') { y += 10; continue; }
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (style === 'label') {
      ctx.font = 'bold 11px monospace'; ctx.fillStyle = '#8888cc';
    } else if (style === 'name') {
      ctx.font = 'bold 28px monospace'; ctx.fillStyle = '#ffe600';
      ctx.shadowColor = 'rgba(255,200,0,0.6)'; ctx.shadowBlur = 14;
    } else if (style === 'value') {
      ctx.font = '15px monospace'; ctx.fillStyle = '#c8d8ff';
    } else if (style === 'thanks') {
      ctx.font = 'bold 15px monospace'; ctx.fillStyle = '#88ffcc';
      ctx.shadowColor = 'rgba(100,255,180,0.5)'; ctx.shadowBlur = 10;
    }
    ctx.fillText(text, W/2, y);
    ctx.restore();
    y += style === 'name' ? 40 : style === 'label' ? 22 : 26;
  }

  menuPulse += 0.04;
  ctx.save();
  ctx.globalAlpha = 0.5 + 0.5 * Math.sin(menuPulse);
  drawHint('ENTER / ESC para volver', H - 28);
  ctx.restore();
  drawMuteIndicator();
}

function startIntroMusic() {
  if (menuUnlocked) return;
  menuUnlocked = true;
  unlockAudio();
  introMusic.play().catch(() => {});
}

function stopIntroMusic() {
  introMusic.pause();
  introMusic.currentTime = 0;
}

function goToMenu(restartMusic=true) {
  inMenu=true; inNameEntry=false; inDifficulty=false; inLeaderboard=false; inCountdown=false; inCredits=false;
  menuUnlocked=true; menuPulse=0; menuOption=0; menuEnterTime=performance.now();
  defeatSong.pause(); defeatSong.currentTime=0;
  if (restartMusic) { introMusic.currentTime=0; }
  introMusic.play().catch(()=>{});
}

function goBack() {
  // vuelve un paso atrás sin tocar la música
  if (inLeaderboard) { inLeaderboard=false; inMenu=true; return; }
  if (inCredits)     { inCredits=false;     inMenu=true; return; }
  if (inDifficulty)  { inDifficulty=false; inNameEntry=true; nameInput.style.display='block'; nameInput.focus(); return; }
  if (inNameEntry)   { nameInput.style.display='none'; nameInput.value=''; inNameEntry=false; inMenu=true; return; }
}

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
    // sweep ascendente de 300Hz a 900Hz
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
    // clic percusivo: ataque instantáneo con dos armónicos y decay rápido
    const env = Math.exp(-t * 40);
    const click = Math.sin(2 * Math.PI * 220 * t) * 0.6
                + Math.sin(2 * Math.PI * 440 * t) * 0.3
                + Math.sin(2 * Math.PI * 880 * t) * 0.1;
    // cola corta de ruido para dar "peso"
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
    // tono agudo breve, como un "tick" de mecanismo
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

  // cancelar fade anterior para que no interfiera
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
    // si stopMusic() ya limpió musicEl antes de que play() resolviera, abortar
    if (musicEl !== incoming) { incoming.pause(); incoming.src = ''; return; }
    const steps = FADE_MS / STEP_MS;
    let tick = 0;
    fadeInterval = setInterval(() => {
      // si stopMusic() limpió musicEl durante el fade, detener
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

// ---- Helpers gráficos ----
function hexToRgb(hex) {
  return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
}
function shadeColor(hex, f) {
  const [r,g,b] = hexToRgb(hex);
  const c = v => Math.max(0,Math.min(255,Math.round(v*f)));
  return `rgb(${c(r)},${c(g)},${c(b)})`;
}
function drawBlock3D(ctx, color, rx, ry, size=CS, bv=BV) {
  const style = currentBlockStyle;
  const pad = 4, r = Math.max(3, size * 0.18);
  const x = rx + pad, y = ry + pad, w = size - pad*2, h = size - pad*2;
  const now = performance.now();

  if (style === 'fire') {
    // brasa: gradiente radial brillante en el centro, oscuro en bordes + glow naranja
    ctx.save();
    ctx.shadowColor = 'rgba(255,120,0,0.7)';
    ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
    ctx.fillStyle = shadeColor(color, 0.5); ctx.fill();
    ctx.restore();
    const fg = ctx.createRadialGradient(x+w*0.5, y+h*0.35, 1, x+w*0.5, y+h*0.5, w*0.7);
    fg.addColorStop(0,   shadeColor(color, 2.2));
    fg.addColorStop(0.4, shadeColor(color, 1.3));
    fg.addColorStop(1,   shadeColor(color, 0.4));
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
    ctx.fillStyle = fg; ctx.fill();
    // veta de calor horizontal
    ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.clip();
    ctx.fillStyle = `rgba(255,200,80,${0.18 + 0.08 * Math.sin(now * 0.005 + rx)})`;
    ctx.fillRect(x, y + h * 0.25, w, h * 0.18);
    ctx.restore();
    // borde brillante
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
    ctx.strokeStyle = shadeColor(color, 2.0); ctx.lineWidth = 1; ctx.stroke();

  } else if (style === 'neon') {
    // base muy oscura + borde con glow
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
    ctx.fillStyle = shadeColor(color, 0.25); ctx.fill();
    const ng = ctx.createLinearGradient(x, y, x, y+h);
    ng.addColorStop(0, shadeColor(color, 0.9));
    ng.addColorStop(1, shadeColor(color, 0.35));
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
    ctx.fillStyle = ng; ctx.fill();
    // glow border
    ctx.save();
    ctx.shadowColor = color; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
    ctx.strokeStyle = shadeColor(color, 1.9); ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
    // línea de brillo superior
    ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.clip();
    ctx.fillStyle = `rgba(255,255,255,0.18)`;
    ctx.fillRect(x, y, w, h * 0.22);
    ctx.restore();

  } else if (style === 'glossy') {
    // vidrio: muy reflejante, gloss grande
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 5;
    ctx.shadowOffsetX = 1; ctx.shadowOffsetY = 2;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
    ctx.fillStyle = shadeColor(color, 0.6); ctx.fill();
    ctx.restore();
    const gg = ctx.createLinearGradient(x, y, x, y+h);
    gg.addColorStop(0,    shadeColor(color, 1.7));
    gg.addColorStop(0.35, shadeColor(color, 1.1));
    gg.addColorStop(1,    shadeColor(color, 0.5));
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
    ctx.fillStyle = gg; ctx.fill();
    // gloss grande tipo cristal
    ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.clip();
    const gloss = ctx.createLinearGradient(x, y, x, y + h*0.55);
    gloss.addColorStop(0,   'rgba(255,255,255,0.70)');
    gloss.addColorStop(0.5, 'rgba(255,255,255,0.18)');
    gloss.addColorStop(1,   'rgba(255,255,255,0)');
    ctx.fillStyle = gloss; ctx.fillRect(x, y, w, h * 0.55);
    // reflejo inferior tenue
    const gloss2 = ctx.createLinearGradient(x, y+h, x, y+h*0.7);
    gloss2.addColorStop(0,   'rgba(255,255,255,0.15)');
    gloss2.addColorStop(1,   'rgba(255,255,255,0)');
    ctx.fillStyle = gloss2; ctx.fillRect(x, y+h*0.7, w, h*0.3);
    ctx.restore();
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1; ctx.stroke();

  } else if (style === 'metal') {
    // cromo: gradiente diagonal duro, casi sin rounding
    const mr = Math.max(2, size * 0.08);
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 3;
    ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 2;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, mr);
    ctx.fillStyle = shadeColor(color, 0.5); ctx.fill();
    ctx.restore();
    const mg = ctx.createLinearGradient(x, y, x+w, y+h);
    mg.addColorStop(0,    shadeColor(color, 2.0));
    mg.addColorStop(0.3,  shadeColor(color, 1.3));
    mg.addColorStop(0.6,  shadeColor(color, 0.8));
    mg.addColorStop(1,    shadeColor(color, 0.3));
    ctx.beginPath(); ctx.roundRect(x, y, w, h, mr);
    ctx.fillStyle = mg; ctx.fill();
    // línea diagonal de reflejo
    ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, w, h, mr); ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x + w*0.15, y + 2); ctx.lineTo(x + w*0.55, y + 2);
    ctx.stroke();
    ctx.restore();
    ctx.beginPath(); ctx.roundRect(x, y, w, h, mr);
    ctx.strokeStyle = shadeColor(color, 1.6); ctx.lineWidth = 1; ctx.stroke();

  } else if (style === 'holo') {
    // holográfico: base + shimmer arcoíris que se desplaza con el tiempo
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 4;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
    ctx.fillStyle = shadeColor(color, 0.8); ctx.fill();
    ctx.restore();
    const hg = ctx.createLinearGradient(x, y, x, y+h);
    hg.addColorStop(0,   shadeColor(color, 1.4));
    hg.addColorStop(1,   shadeColor(color, 0.6));
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
    ctx.fillStyle = hg; ctx.fill();
    // shimmer arcoíris animado
    ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.clip();
    const shift = (now * 0.0004 + rx * 0.02 + ry * 0.01) % 1;
    const rg = ctx.createLinearGradient(x, y, x+w, y+h);
    rg.addColorStop((shift + 0.00) % 1, 'rgba(255,80,80,0.22)');
    rg.addColorStop((shift + 0.17) % 1, 'rgba(255,200,0,0.22)');
    rg.addColorStop((shift + 0.33) % 1, 'rgba(80,255,80,0.22)');
    rg.addColorStop((shift + 0.50) % 1, 'rgba(0,200,255,0.22)');
    rg.addColorStop((shift + 0.67) % 1, 'rgba(160,80,255,0.22)');
    rg.addColorStop((shift + 0.83) % 1, 'rgba(255,80,200,0.22)');
    ctx.fillStyle = rg; ctx.fillRect(x, y, w, h);
    ctx.restore();
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
    ctx.strokeStyle = shadeColor(color, 1.8); ctx.lineWidth = 1; ctx.stroke();

  } else if (style === 'psycho') {
    // alucinación: overlays de color calculados sin ctx.filter (más performante)
    const t = now * 0.0018 + rx * 0.04 + ry * 0.06;
    // base oscura
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
    ctx.fillStyle = shadeColor(color, 0.5); ctx.fill();
    // gradiente base
    const pg = ctx.createLinearGradient(x, y, x+w, y+h);
    pg.addColorStop(0,   shadeColor(color, 1.6));
    pg.addColorStop(0.5, color);
    pg.addColorStop(1,   shadeColor(color, 0.35));
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
    ctx.fillStyle = pg; ctx.fill();
    // tres overlays RGB con fases distintas → efecto hue cycling sin filter
    ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.clip();
    const r1 = Math.max(0, Math.sin(t))         * 0.30;
    const g1 = Math.max(0, Math.sin(t + 2.094)) * 0.30;
    const b1 = Math.max(0, Math.sin(t + 4.189)) * 0.30;
    ctx.fillStyle = `rgba(255,0,0,${r1})`;   ctx.fillRect(x, y, w, h);
    ctx.fillStyle = `rgba(0,255,0,${g1})`;   ctx.fillRect(x, y, w, h);
    ctx.fillStyle = `rgba(0,80,255,${b1})`;  ctx.fillRect(x, y, w, h);
    // gloss pulsante
    ctx.fillStyle = `rgba(255,255,255,${0.12 + 0.12 * Math.abs(Math.sin(t * 1.3))})`;
    ctx.fillRect(x, y, w, h * 0.4);
    ctx.restore();
    // borde con color pulsante (sin filter)
    const borderR = Math.floor(128 + 127 * Math.sin(t));
    const borderG = Math.floor(128 + 127 * Math.sin(t + 2.094));
    const borderB = Math.floor(128 + 127 * Math.sin(t + 4.189));
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
    ctx.strokeStyle = `rgb(${borderR},${borderG},${borderB})`; ctx.lineWidth = 1.5; ctx.stroke();

  } else {
    // default: estilo original
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 2;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
    ctx.fillStyle = shadeColor(color, 0.75); ctx.fill();
    ctx.restore();
    const grad = ctx.createLinearGradient(x, y, x, y+h);
    grad.addColorStop(0,    shadeColor(color, 1.7));
    grad.addColorStop(0.35, shadeColor(color, 1.1));
    grad.addColorStop(1,    shadeColor(color, 0.45));
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
    ctx.fillStyle = grad; ctx.fill();
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
    ctx.strokeStyle = shadeColor(color, 2.0); ctx.lineWidth = 1; ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.clip();
    // gloss superior grande
    const glossTop = ctx.createLinearGradient(x, y, x, y + h * 0.52);
    glossTop.addColorStop(0,   'rgba(255,255,255,0.80)');
    glossTop.addColorStop(0.4, 'rgba(255,255,255,0.30)');
    glossTop.addColorStop(1,   'rgba(255,255,255,0)');
    ctx.fillStyle = glossTop; ctx.fillRect(x, y, w, h * 0.52);
    // reflejo inferior tenue
    const glossBot = ctx.createLinearGradient(x, y+h, x, y+h*0.75);
    glossBot.addColorStop(0,   'rgba(255,255,255,0.18)');
    glossBot.addColorStop(1,   'rgba(255,255,255,0)');
    ctx.fillStyle = glossBot; ctx.fillRect(x, y+h*0.75, w, h*0.25);
    ctx.restore();
  }
}

// ---- Explosión de nivel ----
class ExplosionParticle {
  constructor(x, y, color, angle, speed, size) {
    this.x = x; this.y = y; this.color = color;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.size = size;
    this.life = 1;
    this.decay = 0.012 + Math.random() * 0.018;
    this.gravity = 0.18 + Math.random() * 0.12;
    this.type = Math.random() < 0.4 ? 'star' : 'circle';
    this.rot = Math.random() * Math.PI * 2;
    this.rotSpeed = (-1 + Math.random() * 2) * 0.15;
  }
  update() {
    this.x += this.vx; this.y += this.vy;
    this.vy += this.gravity;
    this.vx *= 0.98;
    this.life -= this.decay;
    this.size = Math.max(0, this.size - 0.06);
    this.rot += this.rotSpeed;
  }
  draw(ctx) {
    if (this.life <= 0 || this.size <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.life);
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.fillStyle = this.color;
    if (this.type === 'star') {
      // estrella de 4 puntas
      ctx.beginPath();
      const s = this.size, h = s * 0.4;
      ctx.moveTo(0,-s); ctx.lineTo(h,-h); ctx.lineTo(s,0);
      ctx.lineTo(h,h);  ctx.lineTo(0,s);  ctx.lineTo(-h,h);
      ctx.lineTo(-s,0); ctx.lineTo(-h,-h); ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, this.size, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.restore();
  }
}

let explosionParticles = [];

function triggerLevelUpExplosion(level) {
  const theme = getTheme(level);
  const colors = [theme.border[1], theme.border[0], '#ffffff', '#ffe600', '#ff8800'];
  const cx = BX + BW / 2, cy = BY + BH / 2;

  // onda expansiva desde el centro
  for (let i = 0; i < 80; i++) {
    const angle = (i / 80) * Math.PI * 2;
    const speed = 4 + Math.random() * 8;
    const size  = 4 + Math.random() * 8;
    const color = colors[Math.floor(Math.random() * colors.length)];
    explosionParticles.push(new ExplosionParticle(cx, cy, color, angle, speed, size));
  }

  // rafagas desde los 4 bordes del tablero
  const edges = [
    { x: BX,      y: cy,      da: 0 },
    { x: BX+BW,   y: cy,      da: Math.PI },
    { x: cx,      y: BY,      da: Math.PI/2 },
    { x: cx,      y: BY+BH,   da: -Math.PI/2 },
  ];
  for (const e of edges) {
    for (let i = 0; i < 20; i++) {
      const spread = 0.9;
      const angle = e.da + Math.PI + (-spread/2 + Math.random()*spread);
      const speed = 3 + Math.random() * 7;
      const color = colors[Math.floor(Math.random() * colors.length)];
      explosionParticles.push(new ExplosionParticle(e.x, e.y, color, angle, speed, 3 + Math.random()*7));
    }
  }
}

function text3D(ctx, text, x, y, font, colorFront, colorDepth, depth=6) {
  ctx.font = font;
  for (let i=depth; i>0; i--) { ctx.fillStyle=colorDepth; ctx.fillText(text, x+i, y+i); }
  ctx.strokeStyle='rgba(0,0,0,0.8)'; ctx.lineWidth=3; ctx.strokeText(text, x, y);
  ctx.fillStyle=colorFront; ctx.fillText(text, x, y);
}

// ---- Lógica Tetris ----
function newPiece() {
  const shapes = Object.keys(PIECES);
  const shape = shapes[Math.floor(Math.random()*shapes.length)];
  return { shape, rot:0, x: Math.floor(COLS/2)-2, y:0 };
}
function getCells(piece) {
  const offsets = PIECES[piece.shape][piece.rot % PIECES[piece.shape].length];
  return offsets.map(([dx,dy]) => [piece.x+dx, piece.y+dy]);
}
function valid(board, piece) {
  for (const [x,y] of getCells(piece)) {
    if (x<0||x>=COLS||y>=ROWS) return false;
    if (y>=0 && board[y][x]) return false;
  }
  return true;
}
function lockPiece(board, piece) {
  for (const [x,y] of getCells(piece))
    if (y>=0) board[y][x] = COLORS[piece.shape];
}
function findFullLines(board) {
  return board.reduce((acc,row,i) => { if(row.every(c=>c)) acc.push(i); return acc; }, []);
}
function clearLines(board, rows) {
  for (const i of rows) { board.splice(i,1); board.unshift(Array(COLS).fill(null)); }
}

// ---- Partículas ----
class Particle {
  constructor(x,y,color) {
    this.x=x; this.y=y; this.color=color;
    const a=Math.random()*Math.PI*2, s=2+Math.random()*5;
    this.vx=Math.cos(a)*s; this.vy=Math.sin(a)*s-Math.random()*3;
    this.life=1; this.decay=0.03+Math.random()*0.04;
    this.size=3+Math.random()*3;
  }
  update() {
    this.x+=this.vx; this.y+=this.vy; this.vy+=0.3;
    this.life-=this.decay; this.size=Math.max(1,this.size-0.05);
  }
  draw(ctx) {
    if (this.life<=0) return;
    ctx.save();
    ctx.globalAlpha=Math.max(0,this.life);
    ctx.fillStyle=this.color;
    ctx.beginPath(); ctx.arc(this.x,this.y,this.size,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }
}

// ---- Bloques game over ----
class FallingBlock {
  constructor(col,row,color) {
    this.x=BX+col*CS; this.y=BY+row*CS; this.color=color;
    this.vx=-1+Math.random()*2; this.vy=-2+Math.random()*1;
    this.gravity=0.3+Math.random()*0.3;
    this.rot=0; this.rotSpeed=-4+Math.random()*8;
    this.alpha=1;
  }
  update() {
    this.vy+=this.gravity; this.x+=this.vx; this.y+=this.vy;
    this.rot+=this.rotSpeed; this.alpha=Math.max(0,this.alpha-0.008);
  }
  draw(ctx) {
    if (this.alpha<=0) return;
    ctx.save();
    ctx.globalAlpha=this.alpha;
    ctx.translate(this.x+CS/2, this.y+CS/2);
    ctx.rotate(this.rot*Math.PI/180);
    drawBlock3D(ctx, this.color, -CS/2, -CS/2);
    ctx.restore();
  }
}

// ---- Texto combo ----
class ComboText {
  constructor(text,color) {
    this.text=text; this.color=color; this.life=1; this.yOff=0;
  }
  update() { this.life-=0.025; this.yOff-=1; }
  draw(ctx) {
    if (this.life<=0) return;
    const scale=Math.min(1.4,1+(1-this.life)*0.3);
    ctx.save();
    ctx.globalAlpha=Math.max(0,this.life);
    ctx.textAlign='center'; ctx.textBaseline='middle';
    const cx=BX+BW/2, cy=BY+BH/2+this.yOff;
    text3D(ctx, this.text, cx, cy, `bold ${Math.round(42*scale)}px monospace`,
           this.color, 'rgba(0,0,0,0.6)', 3);
    ctx.restore();
  }
}

// ---- Dibujado principal ----
function drawHUD(score, level, lines, nextPiece, theme) {
  const hx=BX+BW+16, hw=W-hx-8;
  const h = theme.hud;
  const pr = 7;

  function roundPanel(py, ph) {
    ctx.save();
    ctx.shadowColor='rgba(0,0,0,0.5)'; ctx.shadowBlur=8;
    ctx.beginPath(); ctx.roundRect(hx, py, hw, ph, pr);
    ctx.fillStyle=h.panel; ctx.fill();
    ctx.restore();
    ctx.beginPath(); ctx.roundRect(hx, py, hw, ph, pr);
    ctx.strokeStyle=h.border; ctx.lineWidth=1.5; ctx.stroke();
  }

  function panel(label, value, py) {
    roundPanel(py, 52);
    ctx.fillStyle=h.label; ctx.font='bold 11px monospace'; ctx.textBaseline='top';
    ctx.textAlign='left'; ctx.fillText(label, hx+8, py+7);
    ctx.fillStyle=h.value; ctx.font='bold 22px monospace';
    ctx.fillText(String(value), hx+8, py+22);
  }
  panel('SCORE', score, 28);
  panel('LEVEL', level+1, 90);
  panel('LINES', lines, 152);

  // etiqueta NEXT con fondo propio
  roundPanel(214, 22);
  ctx.fillStyle=h.value; ctx.font='bold 12px monospace'; ctx.textBaseline='middle';
  ctx.textAlign='center'; ctx.fillText('NEXT', hx+hw/2, 225);

  roundPanel(238, 96);
  const offsets=PIECES[nextPiece.shape][0];
  const minDx=Math.min(...offsets.map(([dx])=>dx)), minDy=Math.min(...offsets.map(([,dy])=>dy));
  const maxDx=Math.max(...offsets.map(([dx])=>dx)), maxDy=Math.max(...offsets.map(([,dy])=>dy));
  const nc=CS-4;
  const ox=hx+(hw-(maxDx-minDx+1)*nc)/2-minDx*nc;
  const oy=244+(90-(maxDy-minDy+1)*nc)/2-minDy*nc;
  for (const [dx,dy] of offsets)
    drawBlock3D(ctx, COLORS[nextPiece.shape], ox+dx*nc, oy+dy*nc, nc, Math.max(2,BV-2));

  roundPanel(344, 132);
  ctx.fillStyle=h.label; ctx.font='bold 11px monospace'; ctx.textBaseline='top'; ctx.textAlign='left';
  ctx.fillText('CONTROLES', hx+8, 352);
  const ctrl=[['←→','mover'],['↑','rotar'],['↓','bajar'],['SPC','caída'],['P','pausa'],['N','nivel+']];
  for (let i=0;i<ctrl.length;i++) {
    ctx.fillStyle=h.value; ctx.font='bold 11px monospace'; ctx.fillText(ctrl[i][0], hx+8,  368+i*18);
    ctx.fillStyle=h.label; ctx.font='11px monospace';      ctx.fillText(ctrl[i][1], hx+40, 368+i*18);
  }

  // nombre del tema
  ctx.fillStyle=h.title; ctx.font='italic 10px monospace'; ctx.textBaseline='top'; ctx.textAlign='left';
  ctx.fillText(theme.name, hx+8, 484);

  // título TETRIS arriba del tablero
  ctx.save();
  ctx.textAlign='center'; ctx.textBaseline='middle';
  text3D(ctx,'TETRIS',BX+BW/2,22,'bold 20px monospace',h.title,h.border[0],4);
  ctx.restore();

  // indicador mute
  ctx.save();
  ctx.textAlign='right'; ctx.textBaseline='top';
  ctx.font='bold 13px monospace';
  ctx.fillStyle = musicMuted ? 'rgba(255,100,100,0.9)' : 'rgba(180,255,180,0.85)';
  ctx.shadowColor = musicMuted ? 'rgba(255,0,0,0.4)' : 'rgba(0,255,0,0.3)';
  ctx.shadowBlur = 6;
  ctx.fillText(musicMuted ? '🔇 [M]' : '🔊 [M]', W - 6, 6);
  ctx.restore();
}

function drawGame(state) {
  const { board, piece, nextPiece, score, level, lines,
          flashAlpha, particles, comboTexts } = state;
  const theme = getTheme(level);

  ctx.fillStyle='#0c0c16'; ctx.fillRect(0,0,W,H);

  // panel exterior del tablero (dibujado antes del fondo para que la imagen quede encima)
  { const px=BX-10, py=BY-10, pw=BW+20, ph=BH+20, pr=10;
    ctx.save();
    ctx.shadowColor='rgba(0,0,0,0.7)'; ctx.shadowBlur=18;
    const panelGrad = ctx.createLinearGradient(px, py, px, py+ph);
    panelGrad.addColorStop(0, shadeColor(theme.border[1], 0.6));
    panelGrad.addColorStop(1, shadeColor(theme.border[0], 0.4));
    ctx.beginPath(); ctx.roundRect(px, py, pw, ph, pr);
    ctx.fillStyle = panelGrad; ctx.fill();
    ctx.restore();
  }

  // draw board background (image or video)
  ctx.save();
  ctx.globalAlpha = theme.opacity;
  if (theme.bg.type === 'video') {
    if (levelBgVideo.readyState >= 2) ctx.drawImage(levelBgVideo, BX, BY, BW, BH);
    else { ctx.fillStyle='#191932'; ctx.fillRect(BX,BY,BW,BH); }
  } else {
    const boardBg = getBoardBg(level);
    if (boardBg) ctx.drawImage(boardBg, BX, BY);
  }
  ctx.restore();

  if (flashAlpha>0) {
    ctx.fillStyle=`rgba(255,255,255,${flashAlpha/255})`; ctx.fillRect(BX,BY,BW,BH);
  }

  ctx.strokeStyle=theme.grid; ctx.lineWidth=1;
  for (let c=0;c<=COLS;c++) { ctx.beginPath(); ctx.moveTo(BX+c*CS,BY); ctx.lineTo(BX+c*CS,BY+BH); ctx.stroke(); }
  for (let r=0;r<=ROWS;r++) { ctx.beginPath(); ctx.moveTo(BX,BY+r*CS); ctx.lineTo(BX+BW,BY+r*CS); ctx.stroke(); }

  for (let r=0;r<ROWS;r++)
    for (let c=0;c<COLS;c++)
      if (board[r][c]) drawBlock3D(ctx, board[r][c], BX+c*CS, BY+r*CS);

  // parpadeo de filas completas antes de borrarlas
  if (state.clearingRows) {
    const age = performance.now() - state.clearingRows.startTime;
    const blink = Math.floor(age / 60) % 2 === 0;
    if (blink) {
      for (const row of state.clearingRows.rows) {
        ctx.save();
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(BX, BY + row * CS, BW, CS);
        ctx.restore();
      }
    }
  }

  let ghost={...piece};
  while(true){const t={...ghost,y:ghost.y+1};if(valid(board,t))ghost=t;else break;}
  // pieza fantasma: contorno sólido sin estilos de nivel para mayor visibilidad
  for (const [x,y] of getCells(ghost)) {
    if (y < 0 || board[y][x]) continue;
    const gx = BX + x*CS + 3, gy = BY + y*CS + 3, gs = CS - 6;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.roundRect(gx, gy, gs, gs, 4); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath(); ctx.roundRect(gx, gy, gs, gs, 4); ctx.fill();
    ctx.restore();
  }

  for (const [x,y] of getCells(piece))
    if (y>=0) drawBlock3D(ctx, COLORS[piece.shape], BX+x*CS, BY+y*CS);

  for (const p of particles) p.draw(ctx);

  // combo prominente (encima del tablero, centrado)
  if (state.combo >= 2) {
    const color = COMBO_COLORS[Math.min(state.combo, 4)] || '#ffffff';
    const pulse = 1 + 0.08 * Math.sin(performance.now() / 120);
    const sz = Math.round(22 * pulse);
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `bold ${sz}px monospace`;
    ctx.shadowColor = color; ctx.shadowBlur = 18;
    ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.lineWidth = 4; ctx.lineJoin = 'round';
    ctx.strokeText(`${state.combo}× COMBO`, BX + BW / 2, BY + BH - 28);
    ctx.fillStyle = color;
    ctx.fillText(`${state.combo}× COMBO`, BX + BW / 2, BY + BH - 28);
    ctx.restore();
  }

  for (const ct of comboTexts) ct.draw(ctx);

  // bordes del panel (sin relleno, encima de todo)
  { const px=BX-10, py=BY-10, pw=BW+20, ph=BH+20, pr=10;
    ctx.beginPath(); ctx.roundRect(px, py, pw, ph, pr);
    ctx.strokeStyle = theme.border[1]; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.beginPath(); ctx.roundRect(BX-3, BY-3, BW+6, BH+6, 6);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1; ctx.stroke();
  }

  // banner de nivel (aparece al subir de nivel, dura 2.5s)
  if (state.levelBanner) {
    const age = performance.now() - state.levelBanner.startTime;
    const dur = 2500;
    if (age < dur) {
      const t = age / dur;
      const alpha = t < 0.15 ? t / 0.15 : t > 0.75 ? 1 - (t - 0.75) / 0.25 : 1;
      const slideY = t < 0.15 ? (1 - t / 0.15) * 30 : 0;
      const cy = BY + BH / 2 - 20 + slideY;
      ctx.save();
      ctx.globalAlpha = alpha * 0.92;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.beginPath(); ctx.roundRect(BX + 10, cy - 36, BW - 20, 72, 10); ctx.fill();
      ctx.strokeStyle = theme.border[1]; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(BX + 10, cy - 36, BW - 20, 72, 10); ctx.stroke();
      ctx.globalAlpha = alpha;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold 13px monospace';
      ctx.fillStyle = theme.hud.label;
      ctx.fillText('NIVEL ' + (level + 1), BX + BW / 2, cy - 14);
      ctx.font = 'bold 22px monospace';
      ctx.fillStyle = theme.hud.title;
      ctx.shadowColor = theme.border[1]; ctx.shadowBlur = 12;
      ctx.fillText(state.levelBanner.name, BX + BW / 2, cy + 16);
      ctx.restore();
    } else {
      state.levelBanner = null;
    }
  }

  drawHUD(score, level, lines, nextPiece, theme);
}

// ---- Victoria ----
function playWinSound() {
  if (!audioCtx) return;
  const sr = audioCtx.sampleRate, dur = 2.0;
  const n = Math.floor(sr * dur);
  const buf = audioCtx.createBuffer(1, n, sr);
  const data = buf.getChannelData(0);
  const melody = [523, 659, 784, 1047, 784, 1047, 1319];
  const noteLen = dur / melody.length;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const noteIdx = Math.min(melody.length - 1, Math.floor(t / noteLen));
    const freq = melody[noteIdx];
    const tInNote = t - noteIdx * noteLen;
    const env = Math.max(0, 1 - tInNote / noteLen) * Math.min(1, tInNote * 20);
    data[i] = env * 0.45 * Math.sin(2 * Math.PI * freq * t);
  }
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  const gain = audioCtx.createGain(); gain.gain.value = 0.8;
  src.connect(gain); gain.connect(audioCtx.destination);
  src.start();
}

const winMusic = new Audio(WIN_CONFIG.music);
winMusic.loop = true;
winMusic.volume = 0.8;

function startWinAnim(score, _onRestart, onQuit) {
  stopLevelBgVideo();
  stopMusic();

  winVideo.currentTime = 0;
  winVideo.muted = false;
  winVideo.play().catch(() => { winVideo.muted = true; winVideo.play().catch(()=>{}); });

  winMusic.currentTime = 0;
  winMusic.play().catch(()=>{});

  playWinSound();

  const start = performance.now();
  let stopped = false;

  // ---- Fuegos artificiales ----
  const fireworks = [];   // partículas activas
  let nextLaunch = 0;     // timestamp del próximo lanzamiento

  const FW_COLORS = [
    '#ff4444','#ff8800','#ffee00','#44ff44','#44ccff','#cc44ff','#ff44cc','#ffffff',
    '#ff6666','#ffaa44','#88ff88','#66ddff',
  ];

  function launchFirework(now) {
    // origen: base aleatoria dentro del area del tablero
    const ox = BX + 20 + Math.random() * (BW - 40);
    const oy = BY + BH * 0.55 + Math.random() * (BH * 0.35);
    // punto de explosión: zona superior
    const ex = BX + 15 + Math.random() * (BW - 30);
    const ey = BY + 30 + Math.random() * (BH * 0.45);
    const color = FW_COLORS[Math.floor(Math.random() * FW_COLORS.length)];
    const count = 28 + Math.floor(Math.random() * 20);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const speed = (0.06 + Math.random() * 0.10);
      fireworks.push({
        x: ex, y: ey,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        decay: 0.0008 + Math.random() * 0.0006,
        color,
        size: 2 + Math.random() * 2,
        trail: [],
      });
    }
    // chispa de lanzamiento (línea ascendente)
    fireworks.push({
      x: ox, y: oy, tx: ex, ty: ey,
      life: 1.0, decay: 0.025, isRocket: true, color,
    });
  }

  function updateFireworks(dt) {
    for (let i = fireworks.length - 1; i >= 0; i--) {
      const p = fireworks[i];
      p.life -= p.decay * dt;
      if (p.life <= 0) { fireworks.splice(i, 1); continue; }
      if (!p.isRocket) {
        if (p.trail) { p.trail.push({ x: p.x, y: p.y }); if (p.trail.length > 5) p.trail.shift(); }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 0.00008 * dt;  // gravedad leve
      }
    }
  }

  function drawFireworks() {
    for (const p of fireworks) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life) * 0.9;
      if (p.isRocket) {
        // línea de lanzamiento
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.tx, p.ty);
        ctx.stroke();
      } else {
        // estela
        if (p.trail && p.trail.length > 1) {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1;
          ctx.globalAlpha = Math.max(0, p.life) * 0.3;
          ctx.beginPath();
          ctx.moveTo(p.trail[0].x, p.trail[0].y);
          for (let j = 1; j < p.trail.length; j++) ctx.lineTo(p.trail[j].x, p.trail[j].y);
          ctx.stroke();
          ctx.globalAlpha = Math.max(0, p.life) * 0.9;
        }
        // partícula
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  let lastNow = performance.now();

  function frame(now) {
    if (stopped) return;
    const elapsed = now - start;
    const dt = now - lastNow;
    lastNow = now;

    // lanzar fuego cada 400–700ms
    if (now >= nextLaunch) {
      launchFirework(now);
      nextLaunch = now + 400 + Math.random() * 300;
    }
    updateFireworks(dt);

    ctx.fillStyle = '#0c0c16'; ctx.fillRect(0, 0, W, H);
    if (winVideo.readyState >= 2) ctx.drawImage(winVideo, BX, BY, BW, BH);
    ctx.fillStyle = `rgba(0,0,0,${Math.min(0.40, elapsed / 5000)})`; ctx.fillRect(BX, BY, BW, BH);

    drawFireworks();

    if (elapsed > 600) {
      const cx = BX + BW / 2, cy = BY + BH / 2;
      ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      text3D(ctx, '¡GANASTE!', cx, cy - 60, 'bold 52px monospace', '#ffe600', '#886600', 7);
      text3D(ctx, `Score: ${score}`, cx, cy, 'bold 30px monospace', '#ffffff', '#336600', 5);
      text3D(ctx, 'ESC → menú principal', cx, cy + 55, '17px monospace', '#c8ffc8', '#224422', 3);
      ctx.restore();
    }

    requestAnimationFrame(frame);
  }

  function stopWin() {
    stopped = true;
    winVideo.pause(); winVideo.currentTime = 0;
    winMusic.pause(); winMusic.currentTime = 0;
  }
  function onKey(e) {
    if (e.key === 'Escape') {
      stopWin(); document.removeEventListener('keydown', onKey); onQuit();
    }
  }
  document.addEventListener('keydown', onKey);
  requestAnimationFrame(frame);
}

// ---- Animación de muerte (antes del game over) ----
function startDeathAnim(board, onDone) {
  // El congelado baja de arriba hacia abajo.
  // El desmoronamiento empieza abajo mientras el hielo todavía baja — las fases se solapan.
  const FREEZE_MS       = 4500;
  const CRUMBLE_START   = FREEZE_MS * 0.72;  // el desmoronamiento arranca aquí (ms absolutos)
  const CRUMBLE_MS      = 1800;
  const FADE_MS         = 450;
  const TOTAL_MS        = CRUMBLE_START + CRUMBLE_MS + FADE_MS;
  const GRAVITY         = 0.00020;  // px/ms²

  const start = performance.now();
  deathSound.currentTime = 0; deathSound.play().catch(() => {});
  defeatSong.currentTime = 0; defeatSong.play().catch(() => {});

  const snapshot = board.map(row => [...row]);
  const theme = getTheme(state.level);

  // Pre-generar fragmentos por bloque (6 trozos: grilla 3x2 para más detalle)
  const FRAG_COLS = 3, FRAG_ROWS = 2;
  const fW = CS / FRAG_COLS, fH = CS / FRAG_ROWS;
  const cells = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (!snapshot[r][c]) continue;
      const crumbleDelay = ((ROWS - 1 - r) / ROWS) * 0.60;
      const seed = r * 17 + c * 31;
      const frags = [];
      for (let fi = 0; fi < FRAG_COLS * FRAG_ROWS; fi++) {
        const fcol = fi % FRAG_COLS, frow = Math.floor(fi / FRAG_COLS);
        const s = seed + fi * 13;
        const localCx = fcol * fW + fW / 2;
        const localCy = frow * fH + fH / 2;
        const dx = localCx - CS / 2, dy = localCy - CS / 2;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const spread = 0.7 + (s % 30) / 100;
        const speed = 55 + (s % 50);
        frags.push({
          ox: BX + c * CS + fcol * fW,
          oy: BY + r * CS + frow * fH,
          vx: (dx / len) * spread * speed * 0.001,
          vy: (dy / len) * spread * speed * 0.001 - 0.055,
          rot: ((s % 24) - 12) * 0.004,
          w: fW - 1, h: fH - 1,
        });
      }
      cells.push({ r, c, color: snapshot[r][c], crumbleDelay, frags });
    }
  }

  function frame(now) {
    const elapsed = now - start;
    const t = Math.min(1, elapsed / TOTAL_MS);

    // freezeT: 0→1 durante FREEZE_MS (sigue corriendo aunque empiece el crumble)
    const freezeT = Math.min(1, elapsed / FREEZE_MS);

    // crumbleElapsed: tiempo desde que arrancó el crumble (puede ser 0 si todavía no)
    const crumbleElapsed = Math.max(0, elapsed - CRUMBLE_START);
    const crumbleT = Math.min(1, crumbleElapsed / CRUMBLE_MS);

    ctx.fillStyle = '#0c0c16';
    ctx.fillRect(0, 0, W, H);

    // shake inicial
    const shakeAmt = Math.max(0, (0.12 - freezeT) / 0.12) * 7;
    ctx.save();
    ctx.translate((Math.random()*2-1)*shakeAmt, (Math.random()*2-1)*shakeAmt);

    // panel exterior del tablero
    { const px=BX-10, py=BY-10, pw=BW+20, ph=BH+20, pr=10;
      ctx.save();
      ctx.shadowColor='rgba(0,0,0,0.7)'; ctx.shadowBlur=18;
      const pg = ctx.createLinearGradient(px, py, px, py+ph);
      pg.addColorStop(0, shadeColor(theme.border[1], 0.6));
      pg.addColorStop(1, shadeColor(theme.border[0], 0.4));
      ctx.beginPath(); ctx.roundRect(px, py, pw, ph, pr);
      ctx.fillStyle = pg; ctx.fill();
      ctx.restore();
    }

    // fondo del nivel
    ctx.save();
    ctx.globalAlpha = theme.opacity;
    if (theme.bg.type === 'video') {
      if (levelBgVideo.readyState >= 2) ctx.drawImage(levelBgVideo, BX, BY, BW, BH);
      else { ctx.fillStyle='#191932'; ctx.fillRect(BX,BY,BW,BH); }
    } else {
      const boardBg = getBoardBg(state.level);
      if (boardBg) ctx.drawImage(boardBg, BX, BY);
    }
    ctx.restore();

    // renderizar cada celda: puede estar en fase freeze, crumble, o ambas a la vez
    for (const cell of cells) {
      const { r, c, color, crumbleDelay, frags } = cell;

      // progreso de congelado de esta celda
      const rowDelay = (r / ROWS) * 0.85;
      const blockT = Math.max(0, Math.min(1, (freezeT - rowDelay) / (1 - rowDelay)));
      const colVar = ((c * 7 + r * 3) % 10) / 10 * 0.15;
      const cellFreezeT = Math.min(1, blockT + colVar);

      // progreso de desmoronamiento de esta celda
      const cellCrumbleT = crumbleT > 0
        ? Math.min(1, Math.max(0, crumbleT - crumbleDelay) / (1 - crumbleDelay + 0.001))
        : 0;

      if (cellCrumbleT === 0) {
        // ---- todavía entero: dibujar bloque con overlay de hielo ----
        drawBlock3D(ctx, color, BX + c * CS, BY + r * CS);
        if (cellFreezeT > 0) {
          ctx.fillStyle = `rgba(180,220,255,${cellFreezeT * 0.50})`;
          ctx.fillRect(BX + c * CS, BY + r * CS, CS, CS);
          if (cellFreezeT > 0.4) {
            ctx.fillStyle = `rgba(255,255,255,${(cellFreezeT - 0.4) / 0.6 * 0.85})`;
            ctx.fillRect(BX + c * CS + 2, BY + r * CS + 2, CS - 4, 3);
          }
          if (cellFreezeT > 0.5 && cellFreezeT < 0.95) {
            const sparkA = Math.sin((cellFreezeT - 0.5) / 0.45 * Math.PI) * 0.7;
            ctx.fillStyle = `rgba(200,240,255,${sparkA})`;
            ctx.fillRect(BX + c * CS + CS * 0.2, BY + r * CS + CS * 0.3, 3, 3);
            ctx.fillRect(BX + c * CS + CS * 0.65, BY + r * CS + CS * 0.6, 2, 2);
            ctx.fillRect(BX + c * CS + CS * 0.8, BY + r * CS + CS * 0.2, 2, 3);
          }
        }
      } else {
        // ---- desmoronándose: fragmentos con física ----
        const alpha = Math.max(0, 1 - cellCrumbleT * 1.15);
        const dt = crumbleElapsed - crumbleDelay * CRUMBLE_MS;
        if (dt <= 0 || alpha <= 0) continue;

        for (const fg of frags) {
          const px = fg.ox + fg.vx * dt;
          const py = fg.oy + fg.vy * dt + 0.5 * GRAVITY * dt * dt;
          const angle = fg.rot * dt;
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.translate(px + fg.w / 2, py + fg.h / 2);
          ctx.rotate(angle);
          ctx.fillStyle = color;
          ctx.fillRect(-fg.w / 2, -fg.h / 2, fg.w, fg.h);
          ctx.fillStyle = `rgba(180,220,255,0.55)`;
          ctx.fillRect(-fg.w / 2, -fg.h / 2, fg.w, fg.h);
          ctx.fillStyle = `rgba(255,255,255,0.5)`;
          ctx.fillRect(-fg.w / 2, -fg.h / 2, fg.w, 2);
          ctx.restore();
        }
      }
    }

    // overlay azul global que crece durante el freeze y se disipa al crumble
    const globalIce = Math.max(0, Math.min(0.25,
      Math.max(0, freezeT - 0.5) / 0.5 * 0.25 * (1 - crumbleT * 1.5)
    ));
    if (globalIce > 0) {
      ctx.fillStyle = `rgba(100,160,255,${globalIce})`;
      ctx.fillRect(BX, BY, BW, BH);
    }

    // fade a negro al final
    const fadeAlpha = Math.max(0, (elapsed - CRUMBLE_START - CRUMBLE_MS) / FADE_MS);
    if (fadeAlpha > 0) {
      ctx.fillStyle = `rgba(0,0,0,${fadeAlpha})`;
      ctx.fillRect(0, 0, W, H);
    }

    ctx.restore();

    if (t < 1) {
      requestAnimationFrame(frame);
    } else {
      onDone();
    }
  }
  requestAnimationFrame(frame);
}

// ---- Game Over ----
const gameOverVideo = document.getElementById('gameOverVideo');

function startGameOverAnim(board, score, stats, onRestart, onQuit) {
  const falling = [];
  for (let r=0;r<ROWS;r++)
    for (let c=0;c<COLS;c++)
      if (board[r][c]) falling.push(new FallingBlock(c,r,board[r][c]));
  falling.sort(()=>Math.random()-0.5);

  stopLevelBgVideo();
  gameOverVideo.currentTime=0;
  gameOverVideo.muted=false;
  gameOverVideo.play().catch(()=>{ gameOverVideo.muted=true; gameOverVideo.play().catch(()=>{}); });

  const start=performance.now();
  let stopped=false;

  // formatear tiempo jugado
  const totalSec = Math.floor(stats.elapsed / 1000);
  const mm = String(Math.floor(totalSec / 60)).padStart(2,'0');
  const ss = String(totalSec % 60).padStart(2,'0');
  const timeStr = `${mm}:${ss}`;

  function frame(now) {
    if (stopped) return;
    const elapsed=now-start;
    ctx.fillStyle='#0c0c16'; ctx.fillRect(0,0,W,H);
    if (gameOverVideo.readyState>=2) {
      // centrar el video manteniendo un tamaño razonable
      const vw = BW + 60, vh = BH + 20;
      const vx = W/2 - vw/2, vy = BY - 10;
      ctx.drawImage(gameOverVideo, vx, vy, vw, vh);
    }
    ctx.fillStyle=`rgba(0,0,0,${Math.min(0.55,elapsed/3000)})`; ctx.fillRect(0,0,W,H);
    for (const fb of falling) { fb.update(); fb.draw(ctx); }
    if (elapsed>700) {
      const cx=W/2, cy=H*0.52;
      ctx.save(); ctx.textAlign='center'; ctx.textBaseline='middle';

      // título GAME OVER con 3D profundo y glow
      ctx.font = 'bold 42px monospace'; ctx.lineJoin = 'round';
      // sombra 3D
      for (let i = 10; i > 0; i--) {
        ctx.fillStyle = `rgba(80,0,0,${0.55 - i*0.04})`;
        ctx.fillText('GAME OVER', cx + i, cy + i);
      }
      // contorno grueso
      ctx.strokeStyle = 'rgba(0,0,0,0.95)'; ctx.lineWidth = 10;
      ctx.strokeText('GAME OVER', cx, cy);
      // glow rojo
      ctx.shadowColor = 'rgba(255,40,40,0.9)'; ctx.shadowBlur = 30;
      ctx.fillStyle = '#ff3030'; ctx.fillText('GAME OVER', cx, cy);
      ctx.shadowBlur = 12;       ctx.fillText('GAME OVER', cx, cy);
      ctx.shadowBlur = 0;
      // gloss
      const goGloss = ctx.createLinearGradient(cx, cy - 22, cx, cy + 5);
      goGloss.addColorStop(0, 'rgba(255,255,255,0.60)');
      goGloss.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = goGloss; ctx.fillText('GAME OVER', cx, cy);

      // panel de estadísticas
      const panW=320, panH=168, panX=cx-160, panY=cy+100;
      const fadeIn = Math.min(1,(elapsed-700)/600);
      ctx.globalAlpha = fadeIn;
      ctx.fillStyle='rgba(0,0,0,0.78)';
      ctx.beginPath(); ctx.roundRect(panX, panY, panW, panH, 10); ctx.fill();
      ctx.strokeStyle='rgba(255,80,80,0.5)'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.roundRect(panX, panY, panW, panH, 10); ctx.stroke();

      const rows = [
        ['PUNTAJE',  score.toLocaleString(), '#ffe63c'],
        ['NIVEL',    stats.level,             '#88ffcc'],
        ['LÍNEAS',   stats.lines,             '#88ccff'],
        ['PIEZAS',   stats.pieces,            '#ddaaff'],
        ['MAX COMBO',stats.maxCombo + 'x',    '#ff9966'],
        ['TIEMPO',   timeStr,                 '#ffddaa'],
      ];
      const colW = panW / 2, rowH = panH / rows.length;
      rows.forEach(([label, val, color], i) => {
        const col = i % 2, row = Math.floor(i / 2);
        const lx = panX + col * colW + colW * 0.08;
        const rx = panX + col * colW + colW * 0.92;
        const ry = panY + row * rowH * 2 + rowH;
        ctx.font = '11px monospace'; ctx.fillStyle = '#8888aa';
        ctx.textAlign = 'left'; ctx.fillText(label, lx, ry - 10);
        ctx.font = 'bold 18px monospace'; ctx.fillStyle = color;
        ctx.textAlign = 'right'; ctx.fillText(val, rx, ry + 8);
      });

      ctx.globalAlpha = 1;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      text3D(ctx,'ENTER / ESC  →  menú principal',cx,panY+panH+30,'15px monospace','#c8c8ff','#333366',3);
      ctx.restore();
    }
    requestAnimationFrame(frame);
  }

  function stopVideo() { gameOverVideo.pause(); gameOverVideo.currentTime=0; defeatSong.pause(); defeatSong.currentTime=0; }

  function onKey(e) {
    if (e.key==='Enter'||e.key==='Escape') { stopped=true; stopVideo(); document.removeEventListener('keydown',onKey); onQuit(); }
  }
  document.addEventListener('keydown',onKey);
  requestAnimationFrame(frame);
}

// ---- Estado ----
function applyLevelBg(level) {
  stopLevelBgAudio();
  currentBlockStyle = getTheme(level).blockStyle || 'default';
  const theme = getTheme(level);
  if (theme.bg.type === 'video') {
    const loop = theme.bg.loop !== false;
    const maxLoops = theme.bg.maxLoops || null;

    const onLoopsComplete = maxLoops ? () => {
      if (theme.bg.nextVideo) {
        // cambiar a video secundario (muteado) + audio independiente
        currentLevelBgSrc = '';
        levelBgVideo.loop = true;
        levelBgVideo.muted = true;
        levelBgVideo.src = theme.bg.nextVideo;
        levelBgVideo.play().catch(() => {});
        currentLevelBgSrc = theme.bg.nextVideo;
        if (theme.bg.nextAudio) startLevelBgAudio(theme.bg.nextAudio);
      } else {
        // sin nextVideo: mutear el video actual y dejarlo en loop
        levelBgVideo.muted = true;
        levelBgVideo.loop = true;
      }
    } : null;

    const onEnded = (!maxLoops && !loop) ? () => {
      stopLevelBgVideo();
      if (musicUnlocked) playMusic(level);
    } : null;

    startLevelBgVideo(theme.bg.src, loop, onEnded, maxLoops, onLoopsComplete);
    if (theme.bg.muted) levelBgVideo.muted = true;
    // si hay nextAudio sin maxLoops, arranca junto con el video desde el inicio
    if (!maxLoops && theme.bg.nextAudio) startLevelBgAudio(theme.bg.nextAudio);
    if (theme.bg.keepMusic || theme.bg.muted) {
      // video mudo o keepMusic: la música del nivel debe sonar — dejar que checkMusic la arranque
      if (currentMusicLevel === level) currentMusicLevel = -1;
    } else {
      // el video tiene su propio audio, parar música
      stopMusic();
      currentMusicLevel = level;
    }
  } else {
    stopLevelBgVideo();
    getBoardBg(level); // preload
    // forzar que checkMusic detecte el cambio aunque currentMusicLevel ya fuera este valor
    if (currentMusicLevel === level) currentMusicLevel = -1;
    // si veníamos de un nivel video (sin keepMusic), currentMusicLevel está en ese nivel de video
    // resetear para garantizar que checkMusic dispare playMusic para este nivel imagen
    const prev = getTheme(currentMusicLevel);
    if (prev && prev.bg.type === 'video' && !prev.bg.keepMusic) currentMusicLevel = -1;
  }
}

function createState() {
  applyLevelBg(0);
  return {
    board: Array.from({length:ROWS},()=>Array(COLS).fill(null)),
    piece: newPiece(), nextPiece: newPiece(),
    score:0, level:0, lines:0,
    fallDelay: currentDiff.fallDelay,
    lastFall:performance.now(),
    startTime:performance.now(),
    piecesPlaced:0,
    paused:false, over:false, won:false, combo:0,
    maxCombo:0,
    particles:[], comboTexts:[], flashAlpha:0,
    // animación de líneas: filas parpadeando antes de borrar
    clearingRows: null,   // { rows, startTime } o null
    // banner de nivel
    levelBanner: null,    // { name, startTime } o null
  };
}

function onGameEnd(score, won) {
  const entry = { name: playerName, score, diff: currentDiff.name,
                  level: state.level+1, won, date: new Date().toLocaleDateString(), _new: true };
  saveScore(entry);
  // quitar _new después de mostrar
  setTimeout(() => {
    const s = loadScores();
    s.forEach(x => delete x._new);
    localStorage.setItem('tetrispibal_scores', JSON.stringify(s));
  }, 5000);
  return entry;
}

let state = createState();

function finishLineClear() {
  const { rows } = state.clearingRows;
  state.clearingRows = null;

  for (const row of rows)
    for (let c=0;c<COLS;c++) {
      const color=state.board[row][c]||'#ccc';
      const px=BX+c*CS+CS/2, py=BY+row*CS+CS/2;
      for (let i=0;i<6;i++) state.particles.push(new Particle(px,py,color));
    }
  clearLines(state.board, rows);
  state.flashAlpha = 180;

  state.lines += rows.length;
  state.score += (LINE_SCORES[rows.length]||0) * (state.level+1);
  const newLevel = Math.floor(state.lines/15);
  if (newLevel > state.level) {
    state.level = newLevel;
    if (state.level >= LEVELS.length) { state.won=true; return; }
    state.fallDelay = Math.max(currentDiff.minDelay, currentDiff.fallDelay - state.level * currentDiff.speedStep);
    applyLevelBg(state.level);
    playSound(levelupSound); playSound(levelupSound2);
    if (musicUnlocked) checkMusic(state.level);
    triggerShake(12, 700);
    triggerLevelUpExplosion(state.level);
    state.levelBanner = { name: getTheme(state.level).name, startTime: performance.now() };
  }

  state.piece = state.nextPiece;
  state.nextPiece = newPiece();
  if (!valid(state.board, state.piece)) state.over = true;
}

function doLock() {
  lockPiece(state.board, state.piece);
  playLandSound();
  state.piecesPlaced++;
  const full = findFullLines(state.board);
  if (full.length) {
    state.combo++;
    if (state.combo > state.maxCombo) state.maxCombo = state.combo;
    if (state.combo >= 2) {
      const color = COMBO_COLORS[Math.min(state.combo,4)]||'#ffffff';
      state.comboTexts.push(new ComboText(`${state.combo}x COMBO!`, color));
      if (state.combo >= 3) playSound(monsterSound);
      else playSound(lineSound);
    } else {
      playLineClearSound();
    }
    // iniciar animación de parpadeo de filas (300ms) antes de borrar
    state.clearingRows = { rows: full, startTime: performance.now() };
  } else {
    state.combo = 0;
    state.lines += 0;
    const newLevel = Math.floor(state.lines/15);
    if (newLevel > state.level) {
      state.level = newLevel;
      if (state.level >= LEVELS.length) { state.won=true; return; }
      state.fallDelay = Math.max(currentDiff.minDelay, currentDiff.fallDelay - state.level * currentDiff.speedStep);
      applyLevelBg(state.level);
      playSound(levelupSound); playSound(levelupSound2);
      if (musicUnlocked) checkMusic(state.level);
      triggerShake(12, 700);
      triggerLevelUpExplosion(state.level);
      state.levelBanner = { name: getTheme(state.level).name, startTime: performance.now() };
    }
    state.piece = state.nextPiece;
    state.nextPiece = newPiece();
    if (!valid(state.board, state.piece)) state.over = true;
  }
}

// ---- nombre confirmado con Enter ----
nameInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    e.stopPropagation();
    const n = nameInput.value.trim();
    if (!n) return;
    playerName = n;
    nameInput.style.display = 'none';
    nameInput.value = '';
    inNameEntry = false;
    inDifficulty = true;
  } else if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    goBack();
  }
});

// ---- Input ----
document.addEventListener('keydown', e => {
  // silenciar música con M (funciona siempre)
  if ((e.key === 'm' || e.key === 'M') && document.activeElement !== nameInput) { toggleMute(); return; }

  // menú principal
  if (inMenu) {
    if (!menuUnlocked) {
      menuUnlocked = true;
      menuEnterTime = performance.now();
      unlockAudio();
      introMusic.play().catch(() => {});
      return;
    }
    if (e.key === 'ArrowUp')   { menuOption = (menuOption - 1 + MENU_OPTIONS.length) % MENU_OPTIONS.length; playMenuTick(); return; }
    if (e.key === 'ArrowDown') { menuOption = (menuOption + 1) % MENU_OPTIONS.length; playMenuTick(); return; }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (menuOption === 0) {
        // Jugar → ingresar nombre
        inMenu = false;
        inNameEntry = true;
        nameInput.style.display = 'block';
        nameInput.focus();
      } else if (menuOption === 1) {
        // Ver ranking
        inMenu = false;
        inLeaderboard = true;
        menuPulse = 0;
      } else if (menuOption === 2) {
        // Créditos
        inMenu = false;
        inCredits = true;
        menuPulse = 0;
        levelupSound.currentTime = 0; levelupSound.play().catch(() => {});
      }
    }
    return;
  }

  // entrada de nombre — manejada por nameInput listener, ignorar aquí
  if (inNameEntry) return;

  // selección de dificultad
  if (inDifficulty) {
    if (e.key==='Escape') { e.preventDefault(); goBack(); return; }
    if (e.key==='ArrowUp'||e.key==='ArrowLeft')
      { diffSelected = (diffSelected - 1 + DIFFICULTIES.length) % DIFFICULTIES.length; playMenuTick(); }
    else if (e.key==='ArrowDown'||e.key==='ArrowRight')
      { diffSelected = (diffSelected + 1) % DIFFICULTIES.length; playMenuTick(); }
    else if (e.key==='Enter') {
      e.preventDefault();
      currentDiff = DIFFICULTIES[diffSelected];
      inDifficulty = false;
      inCountdown = true;
      countdownStart = performance.now();
      countdownVal = 5;
      stopIntroMusic();
      state = createState();
      // música del nivel 1 arranca durante el countdown
      musicUnlocked = true;
      checkMusic(state.level);
    }
    return;
  }

  // leaderboard
  if (inLeaderboard) {
    if (e.key==='Enter'||e.key==='Escape') { e.preventDefault(); goBack(); }
    return;
  }

  if (inCredits) {
    if (e.key==='Enter'||e.key==='Escape') { e.preventDefault(); goBack(); }
    return;
  }

  if (!musicUnlocked) { musicUnlocked=true; unlockAudio(); checkMusic(state.level); }
  if (state.over || state.won) return;
  if (e.key==='p'||e.key==='P') {
    state.paused=!state.paused;
    if (state.paused) musicEl&&musicEl.pause();
    else musicEl&&musicEl.play().catch(()=>{});
    return;
  }
  if (state.paused) return;
  if (e.key==='n'||e.key==='N') { state.lines=((state.level+1)*15); doLock(); return; }
  if (e.key==='ArrowLeft') { const t={...state.piece,x:state.piece.x-1}; if(valid(state.board,t))state.piece=t; }
  else if (e.key==='ArrowRight') { const t={...state.piece,x:state.piece.x+1}; if(valid(state.board,t))state.piece=t; }
  else if (e.key==='ArrowUp') { const t={...state.piece,rot:state.piece.rot+1}; if(valid(state.board,t)){state.piece=t; playRotateSound();} }
  else if (e.key==='ArrowDown') { const t={...state.piece,y:state.piece.y+1}; if(valid(state.board,t)){state.piece=t;state.lastFall=performance.now();} }
  else if (e.key===' ') {
    e.preventDefault();
    while(true){const t={...state.piece,y:state.piece.y+1};if(valid(state.board,t))state.piece=t;else break;}
    playHardDropSound();
    doLock();
  }
});

// ---- Game loop ----
let lastTime = performance.now();
function loop(now) {
  const dt=now-lastTime; lastTime=now;

  if (inMenu)        { drawMenu(now);        requestAnimationFrame(loop); return; }
  if (inNameEntry)   { drawNameEntry();      requestAnimationFrame(loop); return; }
  if (inDifficulty)  { drawDifficulty();     requestAnimationFrame(loop); return; }
  if (inLeaderboard) { drawLeaderboard();    requestAnimationFrame(loop); return; }
  if (inCredits)     { drawCredits();        requestAnimationFrame(loop); return; }
  if (inCountdown)   { drawCountdown(now);   requestAnimationFrame(loop); return; }

  if (state.won) {
    stopMusic();
    onGameEnd(state.score, true);
    startWinAnim(state.score,
      ()=>{ goToMenu(); requestAnimationFrame(loop); },
      ()=>{ goToMenu(); requestAnimationFrame(loop); }
    );
    return;
  }
  if (state.over) {
    stopMusic();
    const savedBoard = state.board.map(r => [...r]);
    const savedStats = {
      level:    state.level + 1,
      lines:    state.lines,
      pieces:   state.piecesPlaced,
      maxCombo: state.maxCombo,
      elapsed:  performance.now() - state.startTime,
    };
    const savedScore = state.score;
    onGameEnd(savedScore, false);
    startDeathAnim(savedBoard, () => {
      startGameOverAnim(savedBoard, savedScore, savedStats,
        ()=>{ goToMenu(); requestAnimationFrame(loop); },
        ()=>{ goToMenu(); requestAnimationFrame(loop); }
      );
    });
    return;
  }
  if (!state.paused) {
    // animación de líneas: pausar caída durante el parpadeo
    if (state.clearingRows) {
      const age = now - state.clearingRows.startTime;
      if (age >= 300) finishLineClear();
    } else {
      if (now-state.lastFall>=state.fallDelay) {
        state.lastFall=now;
        const t={...state.piece,y:state.piece.y+1};
        if(valid(state.board,t)) state.piece=t; else doLock();
      }
    }
    state.particles=state.particles.filter(p=>p.life>0);
    state.particles.forEach(p=>p.update());
    state.comboTexts=state.comboTexts.filter(ct=>ct.life>0);
    state.comboTexts.forEach(ct=>ct.update());
    if (state.flashAlpha>0) state.flashAlpha=Math.max(0,state.flashAlpha-12);
    explosionParticles = explosionParticles.filter(p => p.life > 0);
    explosionParticles.forEach(p => p.update());
  }

  // aplicar shake
  const [sx, sy] = getShakeOffset(dt);
  const shaking = sx !== 0 || sy !== 0;
  if (shaking) { ctx.save(); ctx.translate(sx, sy); }

  drawGame(state);

  // partículas de explosión de nivel (encima de todo)
  for (const p of explosionParticles) p.draw(ctx);

  // destello de nivel: borde brillante que se desvanece
  if (shake.elapsed < shake.duration && shake.elapsed > 0) {
    const t = shake.elapsed / shake.duration;
    const a = Math.pow(1-t, 1.5) * 0.7;
    const theme = getTheme(state.level);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.strokeStyle = theme.border[1];
    ctx.lineWidth = 8;
    ctx.beginPath(); ctx.roundRect(BX-10, BY-10, BW+20, BH+20, 10); ctx.stroke();
    ctx.globalAlpha = a * 0.3;
    ctx.fillStyle = theme.border[1];
    ctx.beginPath(); ctx.roundRect(BX-10, BY-10, BW+20, BH+20, 10); ctx.fill();
    ctx.restore();
  }

  if (shaking) ctx.restore();

  if (state.paused) {
    ctx.save();
    ctx.textAlign='center'; ctx.textBaseline='middle';
    text3D(ctx,'PAUSA',BX+BW/2,BY+BH/2,'bold 48px monospace','#ffe600','#886600',5);
    ctx.restore();
  }
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
