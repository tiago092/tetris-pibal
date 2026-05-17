// ---- Fondo del menú ----
let cachedMenuBg = null;
let cachedCountdownBg = null;
const NEON_UI_SATURATION = 0.7;
const PANEL_NEON_SATURATION = 0.46;
const NAME_ENTRY_NEON_SATURATION = 0.36;

function makeMenuBgCache(kind) {
  if (!menuImg.complete || !menuImg.naturalWidth) return null;
  const off = document.createElement('canvas');
  off.width = W; off.height = H;
  const oc = off.getContext('2d');
  oc.filter = kind === 'countdown'
    ? 'brightness(1.00) saturate(0.80) contrast(1.00)'
    : 'brightness(0.80) saturate(0.80) contrast(0.80)';
  oc.drawImage(menuImg, 0, 0, W, H);
  oc.filter = 'none';
  if (kind === 'countdown') {
    const vig = oc.createRadialGradient(W/2, H/2, H*0.05, W/2, H/2, H*0.75);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.55)');
    oc.fillStyle = vig; oc.fillRect(0, 0, W, H);
  } else {
    const vig = oc.createRadialGradient(W/2, H/2, H*0.2, W/2, H/2, H*0.95);
    vig.addColorStop(0, 'rgba(0,0,0,0.15)');
    vig.addColorStop(1, 'rgba(0,0,0,0.68)');
    oc.fillStyle = vig; oc.fillRect(0, 0, W, H);
    oc.fillStyle = 'rgba(0,0,10,0.38)'; oc.fillRect(0, 0, W, H);
  }
  return off;
}

function drawMenuBg() {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  if (menuImg.complete && menuImg.naturalWidth) {
    if (!cachedMenuBg) cachedMenuBg = makeMenuBgCache('menu');
    if (cachedMenuBg) { ctx.drawImage(cachedMenuBg, 0, 0); return; }
    ctx.save();
    ctx.filter = 'brightness(0.80) saturate(0.80) contrast(0.80)';
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
    if (!cachedCountdownBg) cachedCountdownBg = makeMenuBgCache('countdown');
    if (cachedCountdownBg) { ctx.drawImage(cachedCountdownBg, 0, 0); return; }
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
  const font = `${bold?'800 ':'650 '}${fontSize}px Arial Black, Impact, sans-serif`;
  ctx.save();
  ctx.filter = `saturate(${NEON_UI_SATURATION})`;
  ctx.font = font;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  // medir ancho total para centrar
  const chars = text.split('');
  const spacing = fontSize * 0.045;
  const spaceW = fontSize * 0.62;
  const widths = chars.map(c => c === ' ' ? spaceW : ctx.measureText(c).width + spacing);
  const totalW = widths.reduce((a, b) => a + b, 0);
  let cx = x - totalW / 2;
  let colorCount = 0;

  chars.forEach((ch, i) => {
    const lw = widths[i];
    const lx = cx + lw / 2;

    if (ch === ' ') { cx += lw; return; }

    const col = TETRIS_LETTER_COLORS[colorCount % TETRIS_LETTER_COLORS.length];
    colorCount++;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = font;
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;

    // sombra 3D abajo-derecha
    for (let s = 5; s > 0; s--) {
      ctx.fillStyle = `rgba(0,0,0,${0.34 - s * 0.04})`;
      ctx.fillText(ch, lx + s * 0.5, y + s * 0.45);
    }

    // halo exterior y tubo de neon grueso
    ctx.shadowColor = col.top;
    ctx.shadowBlur = fontSize * 0.18;
    ctx.strokeStyle = col.mid;
    ctx.lineWidth = Math.max(6, fontSize * 0.11);
    ctx.strokeText(ch, lx, y);
    ctx.shadowBlur = fontSize * 0.10;
    ctx.strokeStyle = col.top;
    ctx.lineWidth = Math.max(3, fontSize * 0.065);
    ctx.strokeText(ch, lx, y);

    // contorno negro que separa cada letra del brillo
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(0,0,0,0.95)';
    ctx.lineWidth = Math.max(2, fontSize * 0.04);
    ctx.strokeText(ch, lx, y);

    // relleno principal con gradiente vertical
    const th = fontSize;
    const grad = ctx.createLinearGradient(lx, y - th/2, lx, y + th/2);
    grad.addColorStop(0.00, 'rgba(255,255,255,0.82)');
    grad.addColorStop(0.08, col.top);
    grad.addColorStop(0.48, col.mid);
    grad.addColorStop(0.52, col.bot);
    grad.addColorStop(1.00, col.top);
    // glow del color de la letra
    ctx.shadowColor = col.top; ctx.shadowBlur = fontSize * 0.055;
    ctx.fillStyle = grad; ctx.fillText(ch, lx, y);
    ctx.shadowBlur = 0;

    // surco interior para que lea como letra hueca/tubo
    ctx.strokeStyle = 'rgba(255,255,255,0.58)';
    ctx.lineWidth = Math.max(1, fontSize * 0.022);
    ctx.strokeText(ch, lx - 1, y - 1);
    ctx.strokeStyle = 'rgba(0,0,0,0.36)';
    ctx.lineWidth = Math.max(1, fontSize * 0.018);
    ctx.strokeText(ch, lx + 1, y + 1);

    // gloss: reflejo blanco en la parte superior (~40% de la altura)
    const gloss = ctx.createLinearGradient(lx, y - th/2, lx, y - th/2 + th * 0.42);
    gloss.addColorStop(0,   'rgba(255,255,255,0.58)');
    gloss.addColorStop(0.42,'rgba(255,255,255,0.18)');
    gloss.addColorStop(1,   'rgba(255,255,255,0)');
    ctx.fillStyle = gloss;
    ctx.fillText(ch, lx, y);

    ctx.restore();
    cx += lw;
  });

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

function drawCountdownDigit(value, x, y, fontSize, color, glow, alpha=1) {
  const text = String(value);
  const font = `900 ${fontSize}px Arial Black, Impact, sans-serif`;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = font;
  ctx.lineJoin = 'miter';
  ctx.miterLimit = 2;
  ctx.filter = `saturate(${NEON_UI_SATURATION})`;

  for (let s = 6; s > 0; s--) {
    ctx.fillStyle = `rgba(0,0,0,${0.34 - s * 0.04})`;
    ctx.fillText(text, x + s * 0.65, y + s * 0.55);
  }

  ctx.shadowColor = glow;
  ctx.shadowBlur = fontSize * 0.18;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(6, fontSize * 0.12);
  ctx.strokeText(text, x, y);

  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(0,0,0,0.95)';
  ctx.lineWidth = Math.max(3, fontSize * 0.06);
  ctx.strokeText(text, x, y);

  const fill = ctx.createLinearGradient(x, y - fontSize * 0.55, x, y + fontSize * 0.55);
  fill.addColorStop(0, 'rgba(255,255,255,0.94)');
  fill.addColorStop(0.14, color);
  fill.addColorStop(0.62, color);
  fill.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);

  ctx.save();
  ctx.globalAlpha *= 0.22;
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = Math.max(1, fontSize * 0.02);
  const halfW = ctx.measureText(text).width * 0.34;
  for (let yy = y - fontSize * 0.30; yy < y + fontSize * 0.30; yy += Math.max(4, fontSize * 0.08)) {
    ctx.beginPath();
    ctx.moveTo(x - halfW, yy);
    ctx.lineTo(x + halfW, yy);
    ctx.stroke();
  }
  ctx.restore();

  const gloss = ctx.createLinearGradient(x, y - fontSize * 0.52, x, y - fontSize * 0.08);
  gloss.addColorStop(0, 'rgba(255,255,255,0.45)');
  gloss.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gloss;
  ctx.fillText(text, x, y);
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

function drawMenu(now) {
  drawMenuBg();

  if (!menuUnlocked) {
    // título estático antes de desbloquear
    drawRankingTitle('TETRIS PIBAL', W/2, 110, 44);
    menuPulse += 0.04;
    const a = 0.55 + 0.45 * Math.sin(menuPulse);
    ctx.save();
    ctx.globalAlpha = a;
    drawGlowText('PRESIONA ENTER', W/2, H/2, 'bold 24px monospace', '#e0e8ff', 'rgba(100,140,255,0.8)', 20);
    ctx.restore();
    return;
  }

  // animación de entrada: 900ms total
  const ANIM_DUR = 900;
  const age = now - menuEnterTime;
  const titleT  = Math.min(1, age / ANIM_DUR);
  const titleY  = -80 + (110 + 80) * easeOutBounce(titleT);  // cae desde arriba

  drawRankingTitle('TETRIS PIBAL', W/2, titleY, 44);

  // opciones sin caja: solo texto con glow
  menuPulse += 0.04;
  MENU_OPTIONS.forEach((opt, i) => {
    const cyBase = H * MENU_CONFIG.optionsStartY + i * MENU_CONFIG.optionsGap;
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

function drawPixelNameEntry() {
  drawMenuBg();
  drawRankingTitle('TETRIS PIBAL', W/2, 132, 44, NAME_ENTRY_NEON_SATURATION);

  const panW = W - 180;
  const panH = 150;
  const panX = W/2 - panW/2;
  const panY = 280;
  const r = 15;

  ctx.save();
  ctx.filter = `saturate(${NAME_ENTRY_NEON_SATURATION})`;
  ctx.shadowColor = 'rgba(252, 116, 245, 0.45)';
  ctx.shadowBlur = 14;
  ctx.fillStyle = 'rgba(2,4,15,0.78)';
  ctx.beginPath(); ctx.roundRect(panX, panY, panW, panH, r); ctx.fill();
  ctx.shadowBlur = 0;

  const border = ctx.createLinearGradient(panX, panY, panX + panW, panY + panH);
  border.addColorStop(0, '#ffd21d');
  border.addColorStop(0.22, '#ff37f4');
  border.addColorStop(0.48, '#593cff');
  border.addColorStop(0.70, '#18d7ff');
  border.addColorStop(0.88, '#75ff22');
  border.addColorStop(1, '#ffd21d');
  ctx.strokeStyle = border;
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.roundRect(panX, panY, panW, panH, r); ctx.stroke();

  ctx.strokeStyle = 'rgba(255,55,244,0.28)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(panX + 7, panY + 7, panW - 14, panH - 14, r - 6); ctx.stroke();

  const sparkle = (x, y, color) => {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 7;
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(x - 6, y); ctx.lineTo(x + 6, y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x, y + 6); ctx.stroke();
    ctx.restore();
  };

  sparkle(panX + 24, panY + 22, '#ff5af7');
  sparkle(panX + 56, panY + 15, '#35cfff');
  sparkle(panX + panW - 54, panY + 19, '#ffd21d');
  sparkle(panX + panW - 24, panY + 22, '#ff5af7');
  sparkle(panX + 24, panY + panH - 22, '#ff5af7');
  sparkle(panX + panW - 24, panY + panH - 22, '#ffd21d');

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 22px monospace';
  ctx.shadowColor = 'rgba(255,210,29,0.78)';
  ctx.shadowBlur = 12;
  ctx.fillStyle = '#ffd21d';
  ctx.fillText('INGRES\u00c1 TU NOMBRE', W/2, panY + 48);
  ctx.shadowBlur = 0;
  ctx.fillText('INGRES\u00c1 TU NOMBRE', W/2, panY + 48);

  ctx.setLineDash([3, 7]);
  ctx.strokeStyle = 'rgba(196,54,255,0.78)';
  ctx.shadowColor = 'rgba(196,54,255,0.55)';
  ctx.shadowBlur = 8;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(panX + 30, panY + 76); ctx.lineTo(panX + panW - 30, panY + 76); ctx.stroke();
  ctx.setLineDash([]);
  sparkle(W/2, panY + 76, '#9a54ff');

  ctx.restore();

  drawHint('ENTER confirmar   ESC volver', H*0.92);
  drawMuteIndicator();
}

function drawNameEntry() {
  drawPixelNameEntry();
}

function drawDifficulty() {
  drawMenuBg();
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
  const scale = 1.06 - frac * 0.18;
  const alpha = (frac < 0.6 ? 1 : 1 - (frac - 0.6) / 0.4) * 0.82;
  const sz    = Math.round(72 * scale);

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
  ctx.globalAlpha = alpha * 0.55;
  const ringR = 58;
  const arcEnd = -Math.PI/2 + (1 - frac) * Math.PI * 2;
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.beginPath(); ctx.arc(cx, cy, ringR, 0, Math.PI*2); ctx.stroke();
  ctx.shadowColor = pal.glow; ctx.shadowBlur = 10;
  ctx.strokeStyle = pal.ring;
  ctx.beginPath(); ctx.arc(cx, cy, ringR, -Math.PI/2, arcEnd); ctx.stroke();
  ctx.restore();

  // número con efecto 3D y glow
  drawCountdownDigit(countdownVal, cx, cy, sz, pal.mid, pal.glow, alpha);

  // jugador y dificultad
  ctx.save();
  ctx.globalAlpha = 0.75;
  drawGlowText(`${playerName}  ·  ${currentDiff.name}`, W/2, H*0.72, '15px monospace', '#e0e8ff', 'rgba(100,140,255,0.6)', 8);
  ctx.restore();
  drawHint('preparate...', H*0.80);
}

function drawRankingTitle(text, x, y, fontSize=58, saturation=NEON_UI_SATURATION) {
  const font = `900 ${fontSize}px Arial Black, Impact, sans-serif`;
  const colors = ['#ff3c1f', '#ffd21d', '#39f23b', '#11f3d0', '#2387ff', '#9a54ff', '#f447ff'];
  const chars = text.split('');

  ctx.save();
  ctx.filter = `saturate(${saturation})`;
  ctx.font = font;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  const spacing = fontSize * 0.02;
  const widths = chars.map(c => c === ' ' ? fontSize * 0.42 : ctx.measureText(c).width + spacing);
  let cx = x - widths.reduce((a, b) => a + b, 0) / 2;
  let colorCount = 0;

  chars.forEach((ch, i) => {
    const lw = widths[i];
    const lx = cx + lw / 2;
    if (ch === ' ') { cx += lw; return; }

    const color = colors[colorCount % colors.length];
    colorCount++;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = font;
    ctx.lineJoin = 'miter';
    ctx.miterLimit = 2;

    for (let s = 7; s > 0; s--) {
      ctx.fillStyle = `rgba(0,0,0,${0.40 - s * 0.035})`;
      ctx.fillText(ch, lx + s * 0.7, y + s * 0.6);
    }

    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
    ctx.strokeStyle = color;
    ctx.lineWidth = 8;
    ctx.strokeText(ch, lx, y);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(0,0,0,0.95)';
    ctx.lineWidth = 4;
    ctx.strokeText(ch, lx, y);

    const g = ctx.createLinearGradient(lx, y - fontSize * 0.5, lx, y + fontSize * 0.5);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.18, color);
    g.addColorStop(0.52, color);
    g.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = g;
    ctx.fillText(ch, lx, y);

    ctx.globalAlpha = 0.34;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 1;
    for (let yy = y - fontSize * 0.34; yy < y + fontSize * 0.34; yy += 5) {
      ctx.beginPath();
      ctx.moveTo(lx - lw * 0.36, yy);
      ctx.lineTo(lx + lw * 0.36, yy);
      ctx.stroke();
    }
    ctx.restore();
    cx += lw;
  });

  ctx.restore();
}

function drawRankBadge(rank, x, y) {
  const palettes = [
    { fill:'#ffd21d', stroke:'#fff39a', shadow:'rgba(255,210,30,0.75)' },
    { fill:'#c9d5ea', stroke:'#ffffff', shadow:'rgba(190,220,255,0.65)' },
    { fill:'#ff8f2a', stroke:'#ffd2a0', shadow:'rgba(255,130,40,0.65)' },
  ];
  const p = palettes[rank - 1];
  if (!p) return false;

  ctx.save();
  ctx.translate(x, y);
  ctx.shadowColor = p.shadow;
  ctx.shadowBlur = 12;
  ctx.fillStyle = p.fill;
  ctx.strokeStyle = p.stroke;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 4;
    const r = i % 2 === 0 ? 16 : 12;
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#171421';
  ctx.font = '900 18px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(rank), 0, 0);
  ctx.restore();
  return true;
}

function drawPixelScoreTable(scores, tableTop, maxRows=8) {
  const pad = 26, rowH = 46, headerH = 42, tableW = W - pad * 2;
  const tableH = headerH + rowH * maxRows;
  const tableX = pad;
  const cols = [tableX + 28, tableX + 96, tableX + 258, tableX + 360];
  const separators = [tableX + 64, tableX + 210, tableX + 336];
  const bottom = tableTop + tableH;

  ctx.save();
  ctx.filter = `saturate(${PANEL_NEON_SATURATION})`;
  ctx.shadowColor = 'rgba(168,56,255,0.45)';
  ctx.shadowBlur = 18;
  ctx.fillStyle = 'rgba(2,4,15,0.72)';
  ctx.beginPath(); ctx.roundRect(tableX, tableTop, tableW, tableH, 18); ctx.fill();
  ctx.shadowBlur = 0;

  const border = ctx.createLinearGradient(tableX, tableTop, tableX + tableW, bottom);
  border.addColorStop(0, '#ffd21d');
  border.addColorStop(0.25, '#ff37f4');
  border.addColorStop(0.55, '#593cff');
  border.addColorStop(0.78, '#18d7ff');
  border.addColorStop(1, '#75ff22');
  ctx.strokeStyle = border;
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.roundRect(tableX, tableTop, tableW, tableH, 18); ctx.stroke();

  ctx.fillStyle = 'rgba(12,0,32,0.82)';
  ctx.beginPath(); ctx.roundRect(tableX + 5, tableTop + 5, tableW - 10, headerH - 10, 14); ctx.fill();
  ctx.strokeStyle = '#ff40f4';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 5]);
  ctx.beginPath(); ctx.moveTo(tableX + 6, tableTop + headerH); ctx.lineTo(tableX + tableW - 6, tableTop + headerH); ctx.stroke();

  separators.forEach((sx, idx) => {
    ctx.strokeStyle = idx === 2 ? 'rgba(36,202,255,0.65)' : 'rgba(220,48,255,0.72)';
    ctx.beginPath(); ctx.moveTo(sx, tableTop + 8); ctx.lineTo(sx, bottom - 8); ctx.stroke();
  });

  for (let i = 1; i <= maxRows; i++) {
    const y = tableTop + headerH + i * rowH;
    ctx.strokeStyle = i % 2 === 0 ? 'rgba(40,198,255,0.45)' : 'rgba(220,48,255,0.48)';
    ctx.beginPath(); ctx.moveTo(tableX + 8, y); ctx.lineTo(tableX + tableW - 8, y); ctx.stroke();
  }
  ctx.setLineDash([]);

  ctx.font = '900 15px monospace';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  [
    { text:'#', x:cols[0], color:'#ff5af7' },
    { text:'NOMBRE', x:cols[1], color:'#ff5af7' },
    { text:'SCORE', x:cols[2], color:'#ffd21d' },
    { text:'DIFICULTAD', x:cols[3], color:'#35cfff' },
  ].forEach(h => {
    ctx.shadowColor = h.color;
    ctx.shadowBlur = 10;
    ctx.fillStyle = h.color;
    ctx.fillText(h.text, h.x, tableTop + headerH / 2);
  });
  ctx.shadowBlur = 0;

  if (scores.length === 0) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#bfc7ff';
    ctx.font = 'bold 15px monospace';
    ctx.fillText('aun no hay puntajes', W / 2, tableTop + headerH + rowH * 2);
    ctx.restore();
    return;
  }

  scores.slice(0, maxRows).forEach((s, i) => {
    const rowY = tableTop + headerH + i * rowH;
    const cy = rowY + rowH / 2;
    const rank = i + 1;
    const isNew = s._new;
    const rankColor = isNew ? '#ffd21d' : rank === 1 ? '#ffd21d' : rank === 2 ? '#d8e6ff' : rank === 3 ? '#ff8f2a' : rank % 2 ? '#ff5af7' : '#35cfff';

    ctx.fillStyle = isNew ? 'rgba(255,210,29,0.12)' : i % 2 === 0 ? 'rgba(255,255,255,0.035)' : 'rgba(55,0,90,0.12)';
    ctx.fillRect(tableX + 5, rowY + 1, tableW - 10, rowH - 2);

    if (isNew) {
      ctx.strokeStyle = 'rgba(255,210,29,0.75)';
      ctx.lineWidth = 2;
      ctx.strokeRect(tableX + 6, rowY + 4, tableW - 12, rowH - 8);
    }

    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    if (!drawRankBadge(rank, cols[0] + 5, cy)) {
      ctx.shadowColor = rankColor; ctx.shadowBlur = 8;
      ctx.fillStyle = rankColor;
      ctx.font = '900 16px monospace';
      ctx.fillText(String(rank), cols[0], cy);
      ctx.shadowBlur = 0;
    }

    ctx.fillStyle = isNew ? '#fff5a8' : '#ffffff';
    ctx.shadowColor = isNew ? 'rgba(255,210,29,0.75)' : 'rgba(255,255,255,0.28)';
    ctx.shadowBlur = isNew ? 10 : 5;
    ctx.font = `${isNew ? '900' : '700'} 15px monospace`;
    ctx.fillText(s.name.substring(0, 12), cols[1], cy);

    ctx.fillStyle = '#ffd21d';
    ctx.shadowColor = 'rgba(255,210,29,0.75)';
    ctx.shadowBlur = 10;
    ctx.font = '900 15px monospace';
    ctx.fillText(s.score.toLocaleString(), cols[2], cy);

    ctx.fillStyle = '#35cfff';
    ctx.shadowColor = 'rgba(53,207,255,0.60)';
    ctx.shadowBlur = 8;
    ctx.font = '700 12px monospace';
    ctx.fillText(s.diff.substring(0, 18), cols[3], cy);
    ctx.shadowBlur = 0;
  });
  ctx.restore();
}

function drawLeaderboard() {
  drawMenuBg();
  drawRankingTitle('RANKING', W/2, 76, 34);
  if (!leaderboardRefreshing) {
    leaderboardRefreshing = true;
    fetchScoresFromSupabase().finally(() => { leaderboardRefreshing = false; });
  }
  drawPixelScoreTable(loadScores(), 142, 8);
  menuPulse += 0.04;
  ctx.save();
  ctx.globalAlpha = 0.5 + 0.5*Math.sin(menuPulse);
  drawHint('ENTER / ESC para volver', H - 28);
  ctx.restore();
  drawMuteIndicator();
}

function drawPixelCredits() {
  drawMenuBg();
  drawRankingTitle('CR\u00c9DITOS', W/2, 130, 34);

  const panW = W - 150;
  const panH = 300;
  const panX = W/2 - panW/2;
  const panY = 205;
  const r = 15;

  ctx.save();
  ctx.filter = `saturate(${PANEL_NEON_SATURATION})`;
  ctx.shadowColor = 'rgba(255,55,244,0.45)';
  ctx.shadowBlur = 14;
  ctx.fillStyle = 'rgba(2,4,15,0.78)';
  ctx.beginPath(); ctx.roundRect(panX, panY, panW, panH, r); ctx.fill();
  ctx.shadowBlur = 0;

  const border = ctx.createLinearGradient(panX, panY, panX + panW, panY + panH);
  border.addColorStop(0, '#ffd21d');
  border.addColorStop(0.18, '#ff37f4');
  border.addColorStop(0.42, '#593cff');
  border.addColorStop(0.65, '#18d7ff');
  border.addColorStop(0.84, '#75ff22');
  border.addColorStop(1, '#ffd21d');
  ctx.strokeStyle = border;
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.roundRect(panX, panY, panW, panH, r); ctx.stroke();

  ctx.strokeStyle = 'rgba(255,55,244,0.32)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(panX + 7, panY + 7, panW - 14, panH - 14, r - 6); ctx.stroke();

  const sparkle = (x, y, color) => {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 7;
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(x - 6, y); ctx.lineTo(x + 6, y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x, y + 6); ctx.stroke();
    ctx.restore();
  };

  sparkle(panX + 24, panY + 22, '#ff5af7');
  sparkle(panX + panW - 24, panY + 22, '#ff5af7');
  sparkle(panX + 24, panY + panH - 22, '#ff5af7');
  sparkle(panX + panW - 24, panY + panH - 22, '#ffd21d');

  const divider = y => {
    ctx.save();
    ctx.setLineDash([3, 7]);
    ctx.strokeStyle = 'rgba(196,54,255,0.78)';
    ctx.shadowColor = 'rgba(196,54,255,0.55)';
    ctx.shadowBlur = 8;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(panX + 30, y); ctx.lineTo(panX + panW - 30, y); ctx.stroke();
    ctx.setLineDash([]);
    sparkle(W/2, y, '#9a54ff');
    ctx.restore();
  };

  const pixelText = (text, y, font, fill, glow, alpha=1) => {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = font;
    ctx.shadowColor = glow;
    ctx.shadowBlur = 12;
    ctx.fillStyle = fill;
    ctx.fillText(text, W/2, y);
    ctx.shadowBlur = 0;
    ctx.fillText(text, W/2, y);
    ctx.restore();
  };

  pixelText('CREADO POR', panY + 34, '900 15px monospace', '#ff5af7', 'rgba(255,90,247,0.75)');
  pixelText('Turcovein', panY + 64, '900 27px monospace', '#ffd21d', 'rgba(255,210,29,0.85)');
  divider(panY + 90);

  pixelText('DESARROLLADO CON', panY + 116, '900 14px monospace', '#c45aff', 'rgba(196,90,255,0.70)');
  pixelText('Claude (Anthropic)', panY + 145, '800 17px monospace', '#ffffff', 'rgba(255,255,255,0.55)');
  divider(panY + 174);

  pixelText('ASSETS', panY + 202, '900 15px monospace', '#c45aff', 'rgba(196,90,255,0.70)');
  pixelText('Im\u00e1genes y videos', panY + 230, '800 17px monospace', '#ffffff', 'rgba(255,255,255,0.55)');
  pixelText('por Turcovein', panY + 256, '800 16px monospace', '#ffffff', 'rgba(255,255,255,0.50)');

  pixelText('\u00a1Gracias pibe por jugar!', panY + 284, '900 17px monospace', '#75ffb0', 'rgba(117,255,176,0.78)');
  ctx.restore();

  menuPulse += 0.04;
  ctx.save();
  ctx.globalAlpha = 0.5 + 0.5 * Math.sin(menuPulse);
  drawHint('ENTER / ESC para volver', H - 28);
  ctx.restore();
  drawMuteIndicator();
}

function drawCredits() {
  drawPixelCredits();
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
  stopMusic();
  stopLevelBgVideo();
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
