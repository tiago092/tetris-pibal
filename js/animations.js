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
winMusic.preload = 'auto';

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function drawMediaCover(media, x, y, w, h) {
  const mw = media.videoWidth || media.naturalWidth || w;
  const mh = media.videoHeight || media.naturalHeight || h;
  const scale = Math.max(w / mw, h / mh);
  const dw = mw * scale;
  const dh = mh * scale;
  ctx.drawImage(media, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function drawWinBanner(score, x, y, scale=1, alpha=1) {
  const w = 392;
  const h = 150;
  const title = '¡GANASTE!';
  const pulse = 0.9 + Math.sin(performance.now() * 0.008) * 0.1;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  const halo = ctx.createRadialGradient(0, -18, 18, 0, -18, 260);
  halo.addColorStop(0, `rgba(255,238,90,${0.38 * pulse})`);
  halo.addColorStop(0.45, `rgba(255,64,244,${0.18 * pulse})`);
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(-260, -210, 520, 420);

  ctx.shadowColor = 'rgba(0,0,0,0.78)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 8;
  const panel = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
  panel.addColorStop(0, 'rgba(255,255,255,0.18)');
  panel.addColorStop(0.18, 'rgba(24,12,70,0.92)');
  panel.addColorStop(0.58, 'rgba(74,13,102,0.92)');
  panel.addColorStop(1, 'rgba(9,18,44,0.94)');
  ctx.fillStyle = panel;
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, 12);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  const border = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
  border.addColorStop(0, '#ffffff');
  border.addColorStop(0.22, '#ffe600');
  border.addColorStop(0.58, '#ff40f4');
  border.addColorStop(1, '#44ccff');
  ctx.strokeStyle = border;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4, 10);
  ctx.stroke();

  ctx.globalAlpha *= 0.5;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(-w / 2 + 12, -h / 2 + 12, w - 24, h - 24, 7);
  ctx.stroke();
  ctx.globalAlpha = alpha;

  for (let i = 0; i < 18; i++) {
    const px = -w / 2 + 22 + ((i * 53) % (w - 44));
    const py = -h / 2 + 18 + ((i * 31) % (h - 36));
    const s = 2 + (i % 3);
    ctx.fillStyle = i % 2 ? 'rgba(255,230,0,0.88)' : 'rgba(255,255,255,0.72)';
    ctx.fillRect(px - s / 2, py - 1, s, 2);
    ctx.fillRect(px - 1, py - s / 2, 2, s);
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 55px Arial Black, Impact, sans-serif';
  ctx.lineJoin = 'round';

  for (let i = 9; i > 0; i--) {
    ctx.fillStyle = `rgba(66,20,0,${0.42 - i * 0.025})`;
    ctx.fillText(title, i, -20 + i);
  }

  ctx.strokeStyle = 'rgba(0,0,0,0.95)';
  ctx.lineWidth = 11;
  ctx.strokeText(title, 0, -20);
  ctx.strokeStyle = '#8a3d00';
  ctx.lineWidth = 5;
  ctx.strokeText(title, 0, -20);

  const titleFill = ctx.createLinearGradient(0, -54, 0, 18);
  titleFill.addColorStop(0, '#ffffff');
  titleFill.addColorStop(0.28, '#fff07a');
  titleFill.addColorStop(0.62, '#ffb300');
  titleFill.addColorStop(1, '#ff5a00');
  ctx.shadowColor = '#ffe600';
  ctx.shadowBlur = 18;
  ctx.fillStyle = titleFill;
  ctx.fillText(title, 0, -20);
  ctx.shadowBlur = 0;

  const shine = ctx.createLinearGradient(0, -54, 0, -18);
  shine.addColorStop(0, 'rgba(255,255,255,0.78)');
  shine.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = shine;
  ctx.fillText(title, 0, -28);

  const scoreText = `PUNTAJE ${score.toLocaleString()}`;
  ctx.font = '900 21px Arial Black, Impact, sans-serif';
  ctx.strokeStyle = 'rgba(0,0,0,0.92)';
  ctx.lineWidth = 6;
  ctx.strokeText(scoreText, 0, 47);
  ctx.fillStyle = '#dffcff';
  ctx.shadowColor = '#44ccff';
  ctx.shadowBlur = 10;
  ctx.fillText(scoreText, 0, 47);
  ctx.restore();
}

function startWinTransition(score, onDone) {
  const duration = WIN_CONFIG.transitionMs || 2200;
  const start = performance.now();
  const particles = [];
  let nextBurst = 0;

  function burst(now) {
    const colors = ['#ffe600', '#ffffff', '#44ccff', '#ff44cc', '#44ff88', '#ff8844'];
    const cx = BX + BW / 2;
    const cy = BY + BH / 2;
    for (let i = 0; i < 34; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.5;
      const s = 1.8 + Math.random() * 5.2;
      particles.push({
        x: cx + (Math.random() - 0.5) * BW * 0.42,
        y: cy + (Math.random() - 0.5) * BH * 0.18,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - Math.random() * 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 2 + Math.random() * 4,
        life: 1,
        decay: 0.013 + Math.random() * 0.012,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.22,
      });
    }
    nextBurst = now + 330 + Math.random() * 160;
  }

  function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.12;
      p.vx *= 0.985;
      p.rot += p.rotSpeed;
      p.life -= p.decay;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  function drawParticles(alpha) {
    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life) * alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.7);
      ctx.restore();
    }
  }

  function frame(now) {
    const elapsed = now - start;
    const t = Math.min(1, elapsed / duration);
    const titleIn = easeOutCubic(Math.min(1, elapsed / 620));
    const fadeOut = Math.max(0, (elapsed - duration + 520) / 520);
    const pulse = 0.86 + Math.sin(elapsed * 0.012) * 0.08;

    if (now >= nextBurst) burst(now);
    updateParticles();

    drawGame(state);

    ctx.save();
    const glow = ctx.createRadialGradient(BX + BW / 2, BY + BH / 2, 20, BX + BW / 2, BY + BH / 2, BW * 0.82);
    glow.addColorStop(0, `rgba(255,230,80,${0.26 * pulse})`);
    glow.addColorStop(0.48, `rgba(255,70,220,${0.10 * pulse})`);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(BX - 40, BY - 40, BW + 80, BH + 80);

    ctx.globalAlpha = 0.45 * (1 - fadeOut);
    ctx.strokeStyle = '#ffe600';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.roundRect(BX - 10, BY - 10, BW + 20, BH + 20, 10);
    ctx.stroke();
    ctx.restore();

    drawParticles(1 - fadeOut);

    ctx.save();
    ctx.fillStyle = `rgba(0,0,0,${0.18 + 0.18 * titleIn})`;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    drawWinBanner(score, W / 2, H / 2 - 32, 0.72 + titleIn * 0.28, (1 - fadeOut) * titleIn);

    if (fadeOut > 0) {
      ctx.fillStyle = `rgba(0,0,0,${Math.min(1, fadeOut)})`;
      ctx.fillRect(0, 0, W, H);
    }

    if (t < 1) requestAnimationFrame(frame);
    else onDone();
  }

  requestAnimationFrame(frame);
}

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
    if (winVideo.readyState >= 2) drawMediaCover(winVideo, 0, 0, W, H);
    ctx.fillStyle = `rgba(0,0,0,${Math.min(0.45, elapsed / 5000)})`; ctx.fillRect(0, 0, W, H);

    drawFireworks();

    if (elapsed > 600) {
      const cx = W / 2, cy = H / 2;
      const fadeIn = Math.min(1, (elapsed - 600) / 650);
      drawWinBanner(score, cx, cy - 48, 0.96 + Math.sin(elapsed * 0.004) * 0.02, fadeIn);
      ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.globalAlpha = fadeIn;
      text3D(ctx, 'ESC → menú principal', cx, cy + 78, '17px monospace', '#c8ffc8', '#224422', 3);
      ctx.restore();
    }

    requestAnimationFrame(frame);
  }

  function stopWin() {
    stopped = true;
    winVideo.pause(); winVideo.currentTime = 0;
    winMusic.pause(); winMusic.currentTime = 0;
  }
  function finishWin() {
    stopWin();
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('pointerdown', onPointer);
    onQuit();
  }
  function onKey(e) {
    if (e.key === 'Escape' || e.key === 'Enter') finishWin();
  }
  function onPointer(e) {
    if (e.target.closest && e.target.closest('#touchControls')) return;
    finishWin();
  }
  document.addEventListener('keydown', onKey);
  document.addEventListener('pointerdown', onPointer);
  requestAnimationFrame(frame);
}

// ---- Animación de muerte (antes del game over) ----
function startDeathAnim(board, onDone) {
  const FREEZE_MS = 3500;
  const FADE_MS   = 600;
  const TOTAL_MS  = FREEZE_MS + FADE_MS;

  const start = performance.now();
  deathSound.currentTime = 0; deathSound.play().catch(() => {});
  defeatSong.currentTime = 0; defeatSong.play().catch(() => {});

  const snapshot = board.map(row => [...row]);
  const theme = getTheme(state.level);

  const cells = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (snapshot[r][c]) cells.push({ r, c, color: snapshot[r][c] });

  function frame(now) {
    const elapsed = now - start;
    const t       = Math.min(1, elapsed / TOTAL_MS);
    const freezeT = Math.min(1, elapsed / FREEZE_MS);

    ctx.fillStyle = '#0c0c16';
    ctx.fillRect(0, 0, W, H);

    // shake inicial breve
    const shakeAmt = Math.max(0, (0.10 - freezeT) / 0.10) * 6;
    ctx.save();
    ctx.translate((Math.random()*2-1)*shakeAmt, (Math.random()*2-1)*shakeAmt);

    // panel exterior
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

    // bloques con overlay de hielo progresivo de arriba hacia abajo
    for (const { r, c, color } of cells) {
      drawBlock3D(ctx, color, BX + c * CS, BY + r * CS);
      const rowDelay = (r / ROWS) * 0.85;
      const blockT   = Math.max(0, Math.min(1, (freezeT - rowDelay) / (1 - rowDelay)));
      const colVar   = ((c * 7 + r * 3) % 10) / 10 * 0.15;
      const cellT    = Math.min(1, blockT + colVar);
      if (cellT > 0) {
        ctx.fillStyle = `rgba(180,220,255,${cellT * 0.52})`;
        ctx.fillRect(BX + c * CS, BY + r * CS, CS, CS);
        if (cellT > 0.4) {
          ctx.fillStyle = `rgba(255,255,255,${(cellT - 0.4) / 0.6 * 0.85})`;
          ctx.fillRect(BX + c * CS + 2, BY + r * CS + 2, CS - 4, 3);
        }
        if (cellT > 0.5 && cellT < 0.95) {
          const sparkA = Math.sin((cellT - 0.5) / 0.45 * Math.PI) * 0.7;
          ctx.fillStyle = `rgba(200,240,255,${sparkA})`;
          ctx.fillRect(BX + c * CS + CS * 0.2, BY + r * CS + CS * 0.3, 3, 3);
          ctx.fillRect(BX + c * CS + CS * 0.65, BY + r * CS + CS * 0.6, 2, 2);
          ctx.fillRect(BX + c * CS + CS * 0.8, BY + r * CS + CS * 0.2, 2, 3);
        }
      }
    }

    // overlay azul global suave al completarse el freeze
    const globalIce = Math.max(0, freezeT - 0.6) / 0.4 * 0.20;
    if (globalIce > 0) {
      ctx.fillStyle = `rgba(100,160,255,${globalIce})`;
      ctx.fillRect(BX, BY, BW, BH);
    }

    // fade a negro al final
    const fadeAlpha = Math.max(0, (elapsed - FREEZE_MS) / FADE_MS);
    if (fadeAlpha > 0) {
      ctx.fillStyle = `rgba(0,0,0,${fadeAlpha})`;
      ctx.fillRect(0, 0, W, H);
    }

    ctx.restore();

    if (t < 1) { requestAnimationFrame(frame); } else { onDone(); }
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
      ctx.save();
      ctx.filter = 'brightness(1.24) contrast(1.06) saturate(1.08)';
      ctx.drawImage(gameOverVideo, vx, vy, vw, vh);
      ctx.restore();
    }
    ctx.fillStyle=`rgba(0,0,0,${Math.min(0.35,elapsed/3600)})`; ctx.fillRect(0,0,W,H);
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
  function finishGameOver() {
    stopped = true;
    stopVideo();
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('pointerdown', onPointer);
    onQuit();
  }

  function onKey(e) {
    if (e.key==='Enter'||e.key==='Escape') finishGameOver();
  }
  function onPointer(e) {
    if (e.target.closest && e.target.closest('#touchControls')) return;
    finishGameOver();
  }
  document.addEventListener('keydown',onKey);
  document.addEventListener('pointerdown',onPointer);
  requestAnimationFrame(frame);
}
