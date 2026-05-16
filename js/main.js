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

function resizeCanvas() {
  const scaleX = window.innerWidth  / W;
  const scaleY = window.innerHeight / H;
  const scale  = Math.min(scaleX, scaleY);
  canvas.style.width  = Math.floor(W * scale) + 'px';
  canvas.style.height = Math.floor(H * scale) + 'px';
  const rect = canvas.getBoundingClientRect();
  nameInput.style.left = (rect.left + rect.width  / 2) + 'px';
  nameInput.style.top  = (rect.top  + rect.height * 0.565) + 'px';
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ---- Input: nombre ----
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

// ---- Input: teclado ----
document.addEventListener('keydown', e => {
  if ((e.key === 'm' || e.key === 'M') && document.activeElement !== nameInput) { toggleMute(); return; }

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
        inMenu = false; inNameEntry = true;
        nameInput.style.display = 'block'; nameInput.focus();
      } else if (menuOption === 1) {
        inMenu = false; inLeaderboard = true; menuPulse = 0;
      } else if (menuOption === 2) {
        inMenu = false; inCredits = true; menuPulse = 0;
        levelupSound.currentTime = 0; levelupSound.play().catch(() => {});
      }
    }
    return;
  }

  if (inNameEntry) return;

  if (inDifficulty) {
    if (e.key==='Escape') { e.preventDefault(); goBack(); return; }
    if (e.key==='ArrowUp'||e.key==='ArrowLeft')
      { diffSelected = (diffSelected - 1 + DIFFICULTIES.length) % DIFFICULTIES.length; playMenuTick(); }
    else if (e.key==='ArrowDown'||e.key==='ArrowRight')
      { diffSelected = (diffSelected + 1) % DIFFICULTIES.length; playMenuTick(); }
    else if (e.key==='Enter') {
      e.preventDefault();
      currentDiff = DIFFICULTIES[diffSelected];
      inDifficulty = false; inCountdown = true;
      countdownStart = performance.now(); countdownVal = 5;
      stopIntroMusic();
      state = createState();
      musicUnlocked = true;
      checkMusic(state.level);
    }
    return;
  }

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
  if (e.key==='ArrowLeft')  { const t={...state.piece,x:state.piece.x-1}; if(valid(state.board,t))state.piece=t; }
  else if (e.key==='ArrowRight') { const t={...state.piece,x:state.piece.x+1}; if(valid(state.board,t))state.piece=t; }
  else if (e.key==='ArrowUp')   { const t={...state.piece,rot:state.piece.rot+1}; if(valid(state.board,t)){state.piece=t; playRotateSound();} }
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
