// ---- Assets de medios ----
function getTheme(level) { return LEVELS[Math.min(level, LEVELS.length-1)]; }

let boardBgCache = {};
let currentBlockStyle = 'default';

function getBoardBg(level) {
  const theme = getTheme(level);
  if (theme.bg.type === 'video') return null;
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

// Video de fondo para niveles con video
const levelBgVideo = document.createElement('video');
levelBgVideo.loop = true;
levelBgVideo.muted = true;
levelBgVideo.playsInline = true;
levelBgVideo.preload = 'auto';
levelBgVideo.style.display = 'none';
document.body.appendChild(levelBgVideo);

// Audio secundario para niveles con festincumbia-style
const levelBgAudio = document.createElement('video');
levelBgAudio.muted = false;
levelBgAudio.loop = true;
levelBgAudio.playsInline = true;
levelBgAudio.preload = 'auto';
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
let levelBgPlayToken = 0;

function startLevelBgVideo(src, loop=true, onEnded=null, maxLoops=null, onLoopsComplete=null, muted=false) {
  if (currentLevelBgSrc === src) return;
  levelBgPlayToken++;
  const token = levelBgPlayToken;
  currentLevelBgSrc = src;
  levelBgVideo.loop = maxLoops ? false : loop;
  levelBgVideo.muted = !!muted;
  levelBgVideo.playsInline = true;
  levelBgVideo.src = src;

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

  levelBgVideo.play().catch(() => {
    if (token !== levelBgPlayToken) return;
    levelBgVideo.muted = true;
    levelBgVideo.play().catch(() => {});
  });
}

function stopLevelBgVideo() {
  if (!currentLevelBgSrc) return;
  levelBgPlayToken++;
  currentLevelBgSrc = '';
  levelBgVideo.muted = true;
  levelBgVideo.pause();
  levelBgVideo.src = '';
  stopLevelBgAudio();
}

// Video de victoria
const winVideo = document.createElement('video');
winVideo.loop = true;
winVideo.playsInline = true;
winVideo.style.display = 'none';
winVideo.src = WIN_CONFIG.video;
winVideo.preload = 'auto';
document.body.appendChild(winVideo);

// Imagen y música del menú principal
const menuImg = new Image();
menuImg.src = MENU_CONFIG.bg;
const introMusic = new Audio(MENU_CONFIG.music);
introMusic.loop = true;
introMusic.volume = 0.7;
introMusic.preload = 'auto';
