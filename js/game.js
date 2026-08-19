// ---- Lógica Tetris ----
function createPiece(shape) {
  return { shape, rot:0, x: Math.floor(COLS/2)-2, y:0 };
}
function createBag(random=Math.random) {
  const shapes = Object.keys(PIECES);
  for (let i=shapes.length-1;i>0;i--) {
    const j = Math.floor(random()*(i+1));
    [shapes[i],shapes[j]] = [shapes[j],shapes[i]];
  }
  return shapes;
}
function takeNextShape(gameState, random=Math.random) {
  if (!gameState.bag.length) gameState.bag = createBag(random);
  return gameState.bag.shift();
}
function fillNextQueue(gameState, random=Math.random) {
  while (gameState.nextQueue.length < NEXT_QUEUE_SIZE)
    gameState.nextQueue.push(createPiece(takeNextShape(gameState, random)));
}
function getCells(piece) {
  const rotations = PIECES[piece.shape];
  const rot = ((piece.rot % rotations.length) + rotations.length) % rotations.length;
  const offsets = rotations[rot];
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
  for (const i of [...rows].sort((a,b)=>b-a)) board.splice(i,1);
  for (let i=0;i<rows.length;i++) board.unshift(Array(COLS).fill(null));
}

// SRS usa Y positiva hacia arriba; estas tablas ya están convertidas al canvas (Y hacia abajo).
const JLSTZ_KICKS = {
  '0>1':[[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
  '1>0':[[0,0],[1,0],[1,1],[0,-2],[1,-2]],
  '1>2':[[0,0],[1,0],[1,1],[0,-2],[1,-2]],
  '2>1':[[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
  '2>3':[[0,0],[1,0],[1,-1],[0,2],[1,2]],
  '3>2':[[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  '3>0':[[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  '0>3':[[0,0],[1,0],[1,-1],[0,2],[1,2]],
};
const I_KICKS = {
  '0>1':[[0,0],[-2,0],[1,0],[-2,1],[1,-2]],
  '1>0':[[0,0],[2,0],[-1,0],[2,-1],[-1,2]],
  '1>2':[[0,0],[-1,0],[2,0],[-1,-2],[2,1]],
  '2>1':[[0,0],[1,0],[-2,0],[1,2],[-2,-1]],
  '2>3':[[0,0],[2,0],[-1,0],[2,-1],[-1,2]],
  '3>2':[[0,0],[-2,0],[1,0],[-2,1],[1,-2]],
  '3>0':[[0,0],[1,0],[-2,0],[1,2],[-2,-1]],
  '0>3':[[0,0],[-1,0],[2,0],[-1,-2],[2,1]],
};

function tryRotate(board, piece, direction) {
  if (piece.shape === 'O') return { ...piece, rot:(piece.rot+direction+4)%4 };
  const from = ((piece.rot%4)+4)%4;
  const to = (from+direction+4)%4;
  const kicks = (piece.shape === 'I' ? I_KICKS : JLSTZ_KICKS)[`${from}>${to}`] || [[0,0]];
  for (const [dx,dy] of kicks) {
    const candidate = { ...piece, rot:to, x:piece.x+dx, y:piece.y+dy };
    if (valid(board,candidate)) return candidate;
  }
  return null;
}

function isGrounded(board, piece) {
  return !valid(board,{ ...piece, y:piece.y+1 });
}

function applySuccessfulManipulation(gameState, piece, now) {
  if (gameState.groundedAt !== null && gameState.lockResets < MAX_LOCK_RESETS) {
    gameState.lockResets++;
    gameState.groundedAt = now;
  }
  gameState.piece = piece;
  if (isGrounded(gameState.board,piece)) {
    if (gameState.groundedAt === null) gameState.groundedAt = now;
  } else {
    gameState.groundedAt = null;
  }
}

function lockDelayExpired(gameState, now) {
  if (!isGrounded(gameState.board,gameState.piece)) {
    gameState.groundedAt = null;
    return false;
  }
  if (gameState.groundedAt === null) {
    gameState.groundedAt = now;
    return false;
  }
  return now-gameState.groundedAt >= LOCK_DELAY_MS;
}

function gravityStep(gameState, now) {
  const candidate = { ...gameState.piece, y:gameState.piece.y+1 };
  gameState.lastFall = now;
  if (!valid(gameState.board,candidate)) {
    if (gameState.groundedAt === null) gameState.groundedAt = now;
    return false;
  }
  gameState.piece = candidate;
  gameState.groundedAt = isGrounded(gameState.board,candidate) ? now : null;
  return true;
}

function activatePiece(gameState, piece, canHold, now=performance.now()) {
  gameState.piece = createPiece(piece.shape);
  gameState.canHold = canHold;
  gameState.groundedAt = null;
  gameState.lockResets = 0;
  gameState.lastFall = now;
  if (!valid(gameState.board,gameState.piece)) gameState.over = true;
}

function activateNextPiece(gameState, now=performance.now(), random=Math.random) {
  const next = gameState.nextQueue.shift();
  fillNextQueue(gameState,random);
  activatePiece(gameState,next,true,now);
}

function holdCurrentPiece(gameState, now=performance.now(), random=Math.random) {
  if (!gameState.canHold || gameState.clearingRows || gameState.over || gameState.won) return false;
  const outgoing = createPiece(gameState.piece.shape);
  if (gameState.heldPiece) {
    const incoming = gameState.heldPiece;
    gameState.heldPiece = outgoing;
    activatePiece(gameState,incoming,false,now);
  } else {
    gameState.heldPiece = outgoing;
    const incoming = gameState.nextQueue.shift();
    fillNextQueue(gameState,random);
    activatePiece(gameState,incoming,false,now);
  }
  return true;
}

function isPerfectClearAfterRows(board, rows) {
  const cleared = new Set(rows);
  return board.every((row,index)=>cleared.has(index) || row.every(cell=>!cell));
}

// ---- Estado del juego ----
function applyLevelBg(level) {
  stopLevelBgAudio();
  currentBlockStyle = getTheme(level).blockStyle || 'default';
  const theme = getTheme(level);
  if (theme.bg.type === 'video') {
    const loop = theme.bg.loop !== false;
    const maxLoops = theme.bg.maxLoops || null;

    const onLoopsComplete = maxLoops ? () => {
      if (theme.bg.nextVideo) {
        currentLevelBgSrc = '';
        levelBgVideo.loop = true;
        levelBgVideo.muted = true;
        levelBgVideo.src = theme.bg.nextVideo;
        levelBgVideo.play().catch(() => {});
        currentLevelBgSrc = theme.bg.nextVideo;
        if (theme.bg.nextAudio) startLevelBgAudio(theme.bg.nextAudio);
      } else {
        levelBgVideo.muted = true;
        levelBgVideo.loop = true;
      }
    } : null;

    const onEnded = (!maxLoops && !loop) ? () => {
      stopLevelBgVideo();
      if (musicUnlocked) playMusic(level);
    } : null;

    startLevelBgVideo(theme.bg.src, loop, onEnded, maxLoops, onLoopsComplete, !!theme.bg.muted);
    if (theme.bg.muted) levelBgVideo.muted = true;
    if (!maxLoops && theme.bg.nextAudio) startLevelBgAudio(theme.bg.nextAudio);
    if (theme.bg.keepMusic || theme.bg.muted) {
      if (currentMusicLevel === level) currentMusicLevel = -1;
    } else {
      stopMusic();
      currentMusicLevel = level;
    }
  } else {
    stopLevelBgVideo();
    getBoardBg(level);
    if (currentMusicLevel === level) currentMusicLevel = -1;
    const prev = getTheme(currentMusicLevel);
    if (prev && prev.bg.type === 'video' && !prev.bg.keepMusic) currentMusicLevel = -1;
  }
}

function createState() {
  applyLevelBg(0);
  const gameState = {
    board: Array.from({length:ROWS},()=>Array(COLS).fill(null)),
    bag:[], nextQueue:[], heldPiece:null, canHold:true,
    piece:null,
    score:0, level:0, lines:0,
    fallDelay: currentDiff.fallDelay,
    lastFall:performance.now(),
    startTime:performance.now(),
    piecesPlaced:0,
    paused:false, over:false, won:false, combo:0,
    maxCombo:0,
    particles:[], comboTexts:[], flashAlpha:0,
    clearingRows: null,
    levelBanner: null,
    specialBanner: null,
    groundedAt:null,
    lockResets:0,
  };
  gameState.piece = createPiece(takeNextShape(gameState));
  fillNextQueue(gameState);
  return gameState;
}

function onGameEnd(score, won) {
  const finalLevel = Math.max(1, Math.min(state.level + 1, LEVELS.length));
  const entry = { name: playerName, score, diff: currentDiff.name,
                  level: finalLevel, won, date: new Date().toLocaleDateString(), _new: true };
  saveScore(entry);
  if (!isSupabaseLeaderboardEnabled()) {
    setTimeout(() => {
      const s = loadScores();
      s.forEach(x => delete x._new);
      localStorage.setItem(SCORES_STORAGE_KEY, JSON.stringify(s));
    }, 5000);
  }
  return entry;
}

let state; // inicializado en main.js después de que currentDiff esté disponible

function finishLineClear() {
  const { rows, special } = state.clearingRows;
  state.clearingRows = null;

  for (const row of rows)
    for (let c=0;c<COLS;c++) {
      const color=state.board[row][c]||'#ccc';
      const px=BX+c*CS+CS/2, py=BY+row*CS+CS/2;
      for (let i=0;i<6;i++) state.particles.push(new Particle(px,py,color));
    }
  clearLines(state.board, rows);
  state.flashAlpha = 180;
  if (special) {
    state.specialBanner = { text:special, startTime:performance.now() };
    triggerShake(special === 'PERFECT CLEAR' ? 10 : 7, 420);
    if (navigator.vibrate) navigator.vibrate(special === 'PERFECT CLEAR' ? [25,20,40] : 30);
  }

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

  activateNextPiece(state);
}

function doLock() {
  if (state.clearingRows) return;
  lockPiece(state.board, state.piece);
  state.groundedAt = null;
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
    const perfect = isPerfectClearAfterRows(state.board,full);
    const special = perfect ? 'PERFECT CLEAR' : full.length === 4 ? 'TETRIS' : null;
    state.clearingRows = { rows: full, startTime: performance.now(), special };
  } else {
    state.combo = 0;
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
    activateNextPiece(state);
  }
}
