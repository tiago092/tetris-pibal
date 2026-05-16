// ---- Animaciones: victoria, muerte, game over ----
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

