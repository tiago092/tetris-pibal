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
    clearingRows: null,
    levelBanner: null,
  };
}

function onGameEnd(score, won) {
  const entry = { name: playerName, score, diff: currentDiff.name,
                  level: state.level+1, won, date: new Date().toLocaleDateString(), _new: true };
  saveScore(entry);
  setTimeout(() => {
    const s = loadScores();
    s.forEach(x => delete x._new);
    localStorage.setItem('tetrispibal_scores', JSON.stringify(s));
  }, 5000);
  return entry;
}

let state; // inicializado en main.js después de que currentDiff esté disponible

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
    state.clearingRows = { rows: full, startTime: performance.now() };
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
    state.piece = state.nextPiece;
    state.nextPiece = newPiece();
    if (!valid(state.board, state.piece)) state.over = true;
  }
}
