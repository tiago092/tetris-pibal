// ---- Estado global de flujo ----
let inMenu       = true;
let inNameEntry  = false;
let inDifficulty = false;
let inLeaderboard = false;
let inCredits     = false;
let inCountdown  = false;
let countdownVal = 5;
let countdownStart = 0;
let menuOption   = 0;
const MENU_OPTIONS = ['JUGAR', 'VER RANKING', 'CRÉDITOS'];
let menuUnlocked = false;
let menuPulse    = 0;
let diffSelected = 1;
let playerName   = '';
let currentDiff  = DIFFICULTIES[1];
let menuEnterTime = 0;
let leaderboardRefreshing = false;

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

// ---- Canvas setup ----
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
canvas.width = W; canvas.height = H;

// ---- Input HTML para nombre ----
const nameInput = document.createElement('input');
nameInput.type = 'text';
nameInput.maxLength = 16;
nameInput.placeholder = 'Tu nombre...';
nameInput.autocomplete = 'off';
nameInput.enterKeyHint = 'done';
Object.assign(nameInput.style, {
  position:'absolute', left:'50%', top:'52%',
  transform:'translate(-50%,-50%)',
  background:'rgba(1,3,12,0.78)',
  color:'#ffffff',
  border:'2px solid #ff40f4',
  borderRadius:'8px',
  padding:'8px 14px', fontSize:'19px', fontFamily:'monospace',
  textAlign:'center', outline:'none', display:'none', zIndex:'10',
  width:'220px',
  filter:'saturate(0.5)',
  boxShadow:'0 0 18px rgba(255,55,244,0.55), 0 0 26px rgba(24,215,255,0.28), inset 0 0 18px rgba(89,60,255,0.20)',
  caretColor:'#ffe600',
});
document.body.appendChild(nameInput);

function resizeCanvas() {
  const scaleX = window.innerWidth  / W;
  const controlsReserve = document.body.classList.contains('touch-game-active') ? 150 : 0;
  const scaleY = Math.max(0.2, (window.innerHeight - controlsReserve) / H);
  const scale  = Math.min(scaleX, scaleY);
  canvas.style.width  = Math.floor(W * scale) + 'px';
  canvas.style.height = Math.floor(H * scale) + 'px';
  const rect = canvas.getBoundingClientRect();
  nameInput.style.left = (rect.left + rect.width  / 2) + 'px';
  nameInput.style.top  = (rect.top  + rect.height * 0.565) + 'px';
}
window.addEventListener('resize', resizeCanvas);
window.resizeGameCanvas = resizeCanvas;
resizeCanvas();

function unlockGameAudio() {
  unlockAudio();
  musicUnlocked = true;
}

function startMenuAudio() {
  menuUnlocked = true;
  menuEnterTime = performance.now();
  unlockAudio();
  stopMusic();
  stopLevelBgVideo();
  introMusic.play().catch(() => {});
}

function submitPlayerName() {
  const n = nameInput.value.trim();
  if (!n) return false;
  playerName = n;
  nameInput.style.display = 'none';
  nameInput.value = '';
  inNameEntry = false;
  inDifficulty = true;
  return true;
}

function selectMenuOption() {
  if (menuOption === 0) {
    inMenu = false; inNameEntry = true;
    nameInput.style.display = 'block'; nameInput.focus();
  } else if (menuOption === 1) {
    inMenu = false; inLeaderboard = true; menuPulse = 0;
    refreshScoresFromSupabase();
  } else if (menuOption === 2) {
    inMenu = false; inCredits = true; menuPulse = 0;
    levelupSound.currentTime = 0; levelupSound.play().catch(() => {});
  }
}

function startSelectedDifficulty() {
  currentDiff = DIFFICULTIES[diffSelected];
  inDifficulty = false; inCountdown = true;
  countdownStart = performance.now(); countdownVal = 5;
  stopIntroMusic();
  state = createState();
  unlockGameAudio();
  checkMusic(state.level);
}

function pauseGame() {
  if (!state || state.over || state.won) return;
  state.paused = !state.paused;
  if (state.paused) musicEl && musicEl.pause();
  else musicEl && musicEl.play().catch(() => {});
}

function movePiece(dx) {
  if (!state || state.paused || state.over || state.won) return;
  const t = { ...state.piece, x: state.piece.x + dx };
  if (valid(state.board, t)) state.piece = t;
}

function rotatePiece() {
  if (!state || state.paused || state.over || state.won) return;
  const t = { ...state.piece, rot: state.piece.rot + 1 };
  if (valid(state.board, t)) { state.piece = t; playRotateSound(); }
}

function softDropPiece() {
  if (!state || state.paused || state.over || state.won) return;
  const t = { ...state.piece, y: state.piece.y + 1 };
  if (valid(state.board, t)) { state.piece = t; state.lastFall = performance.now(); }
}

function hardDropPiece() {
  if (!state || state.paused || state.over || state.won) return;
  while (true) {
    const t = { ...state.piece, y: state.piece.y + 1 };
    if (valid(state.board, t)) state.piece = t;
    else break;
  }
  playHardDropSound();
  doLock();
}

function handleGameTap(x, y) {
  if (inMenu) {
    if (!menuUnlocked) { startMenuAudio(); return; }
    for (let i = 0; i < MENU_OPTIONS.length; i++) {
      const cy = H * MENU_CONFIG.optionsStartY + i * MENU_CONFIG.optionsGap;
      if (Math.abs(y - cy) <= 30) {
        menuOption = i;
        selectMenuOption();
        return;
      }
    }
    return;
  }
  if (inNameEntry) { nameInput.focus(); return; }
  if (inDifficulty) {
    for (let i = 0; i < DIFFICULTIES.length; i++) {
      const cy = H * 0.46 + i * 62;
      if (Math.abs(y - cy) <= 30) {
        if (diffSelected === i) startSelectedDifficulty();
        else { diffSelected = i; playMenuTick(); }
        return;
      }
    }
    return;
  }
  if (inLeaderboard || inCredits) { goBack(); return; }
  if (!inCountdown) rotatePiece();
}

function handleGameAction(action) {
  const type = typeof action === 'string' ? action : action && action.type;
  if (!type) return;

  if (type === 'unlock' || type === 'start') {
    if (inMenu) startMenuAudio();
    else {
      unlockGameAudio();
      if (state && !state.over && !state.won) checkMusic(state.level);
    }
    return;
  }
  if (type === 'mute') { toggleMute(); return; }
  if (type === 'back') { goBack(); return; }
  if (type === 'tap') { handleGameTap(action.x, action.y); return; }

  if (inMenu) {
    if (!menuUnlocked) { startMenuAudio(); return; }
    if (type === 'up') { menuOption = (menuOption - 1 + MENU_OPTIONS.length) % MENU_OPTIONS.length; playMenuTick(); return; }
    if (type === 'down') { menuOption = (menuOption + 1) % MENU_OPTIONS.length; playMenuTick(); return; }
    if (type === 'confirm') { selectMenuOption(); return; }
    return;
  }

  if (inNameEntry) {
    if (type === 'confirm') submitPlayerName();
    return;
  }

  if (inDifficulty) {
    if (type === 'up' || type === 'left') {
      diffSelected = (diffSelected - 1 + DIFFICULTIES.length) % DIFFICULTIES.length;
      playMenuTick();
    } else if (type === 'down' || type === 'right') {
      diffSelected = (diffSelected + 1) % DIFFICULTIES.length;
      playMenuTick();
    } else if (type === 'confirm') {
      startSelectedDifficulty();
    }
    return;
  }

  if (inLeaderboard || inCredits) {
    if (type === 'confirm') goBack();
    return;
  }

  if (!musicUnlocked) { unlockGameAudio(); checkMusic(state.level); }
  if (type === 'pause') { pauseGame(); return; }
  if (type === 'levelSkip') { state.lines = ((state.level + 1) * 15); doLock(); return; }
  if (state.paused || state.over || state.won) return;
  if (type === 'left') movePiece(-1);
  else if (type === 'right') movePiece(1);
  else if (type === 'rotate' || type === 'up') rotatePiece();
  else if (type === 'softDrop') softDropPiece();
  else if (type === 'hardDrop') hardDropPiece();
}

window.handleGameAction = handleGameAction;
window.getGameUiState = function getGameUiState() {
  return {
    inMenu, inNameEntry, inDifficulty, inLeaderboard, inCredits, inCountdown,
    inGame: !inMenu && !inNameEntry && !inDifficulty && !inLeaderboard && !inCredits && !inCountdown,
    menuUnlocked,
    paused: !!(state && state.paused),
    over: !!(state && state.over),
    won: !!(state && state.won),
  };
};

// ---- Input: nombre ----
nameInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    e.stopPropagation();
    submitPlayerName();
  } else if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    handleGameAction('back');
  }
});

// ---- Input: teclado ----
document.addEventListener('keydown', e => {
  if (inNameEntry) return;
  if ((e.key === 'm' || e.key === 'M') && document.activeElement !== nameInput) { handleGameAction('mute'); return; }
  if (e.key === 'ArrowUp') { handleGameAction('up'); return; }
  if (e.key === 'ArrowDown') { handleGameAction(inMenu || inDifficulty ? 'down' : 'softDrop'); return; }
  if (e.key === 'ArrowLeft') { handleGameAction('left'); return; }
  if (e.key === 'ArrowRight') { handleGameAction('right'); return; }
  if (e.key === 'Enter') { e.preventDefault(); handleGameAction('confirm'); return; }
  if (e.key === 'Escape') { e.preventDefault(); handleGameAction('back'); return; }
  if (e.key === 'p' || e.key === 'P') { handleGameAction('pause'); return; }
  if (e.key === 'n' || e.key === 'N') { handleGameAction('levelSkip'); return; }
  if (e.key === ' ') {
    e.preventDefault();
    handleGameAction('hardDrop');
  }
});

window.addEventListener('pointerdown', () => {
  if (!audioCtx) unlockAudio();
}, { passive: true });

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (state && !state.over && !state.won && !state.paused && !inMenu && !inNameEntry && !inDifficulty && !inLeaderboard && !inCredits && !inCountdown) {
      state.paused = true;
    }
    if (musicEl) musicEl.pause();
    introMusic.pause();
    levelBgAudio.pause();
    defeatSong.pause();
    winMusic.pause();
  } else {
    if (inMenu && menuUnlocked) introMusic.play().catch(() => {});
  }
});

if (window.installTouchControls) {
  window.installTouchControls({ canvas, dispatch: handleGameAction });
}

// ---- Game loop ----
let lastTime = performance.now();
let lastMediaEnsure = 0;
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
    if (now - lastMediaEnsure > 1500) {
      lastMediaEnsure = now;
      if (musicUnlocked) checkMusic(state.level);
      const theme = getTheme(state.level);
      if (theme.bg.type === 'video' && levelBgVideo.paused && currentLevelBgSrc) {
        levelBgVideo.play().catch(() => {});
      }
    }
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

  const [sx, sy] = getShakeOffset(dt);
  const shaking = sx !== 0 || sy !== 0;
  if (shaking) { ctx.save(); ctx.translate(sx, sy); }

  drawGame(state);

  for (const p of explosionParticles) p.draw(ctx);

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

state = createState();
requestAnimationFrame(loop);
