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
    this.text=text; this.color=color; this.life=1;
  }
  update() { this.life-=0.022; }
  draw(ctx) {
    if (this.life<=0) return;
    const age = 1 - this.life;
    const pop = age < 0.18 ? age / 0.18 : 1;
    const fade = this.life < 0.24 ? this.life / 0.24 : 1;
    const bounce = 1 + Math.sin(pop * Math.PI) * 0.18;
    const lift = age * 12;
    const cx = BX + BW / 2;
    const cy = BY + 34 - lift;
    const w = 220;
    const h = 46;

    ctx.save();
    ctx.globalAlpha = Math.max(0, fade);
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.translate(cx, cy);
    ctx.scale(bounce, bounce);

    const panel = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
    panel.addColorStop(0, 'rgba(255,255,255,0.22)');
    panel.addColorStop(0.18, 'rgba(20,20,35,0.92)');
    panel.addColorStop(1, 'rgba(0,0,0,0.78)');

    ctx.shadowColor = this.color;
    ctx.shadowBlur = 20;
    ctx.fillStyle = panel;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, 9);
    ctx.fill();

    ctx.lineWidth = 2.5;
    ctx.strokeStyle = this.color;
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(-w / 2 + 5, -h / 2 + 5, w - 10, h - 10, 6);
    ctx.stroke();

    ctx.font = '900 28px Arial Black, Impact, sans-serif';
    ctx.lineJoin = 'round';
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 14;
    ctx.strokeStyle = 'rgba(0,0,0,0.92)';
    ctx.lineWidth = 5;
    ctx.strokeText(this.text, 0, 1);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(this.text, 0, 1);

    ctx.globalAlpha *= 0.45;
    ctx.fillStyle = this.color;
    ctx.fillRect(-w / 2 + 12, -h / 2 + 8, w - 24, 3);
    ctx.fillRect(-w / 2 + 12, h / 2 - 11, w - 24, 2);
    ctx.restore();
  }
}

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

  // combo fijo anterior desactivado; el popup animado se dibuja arriba.
  if (false && state.combo >= 2) {
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
