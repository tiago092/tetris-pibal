// ---- Fondo del menú ----
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

    // sombra 3D abajo-derecha (reducida)
    for (let s = 5; s > 0; s--) {
      ctx.fillStyle = `rgba(0,0,0,${0.45 - s * 0.06})`;
      ctx.fillText(ch, lx + s, y + s);
    }

    // contorno fino
    ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.lineWidth = 4;
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

