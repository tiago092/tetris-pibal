// ---- Controles tactiles moviles ----
function installTouchControls({ canvas, dispatch }) {
  if (!canvas || !dispatch || window.__touchControlsInstalled) return;
  window.__touchControlsInstalled = true;

  const isCoarse = window.matchMedia('(pointer: coarse)').matches;
  const root = document.createElement('div');
  root.id = 'touchControls';
  root.innerHTML = `
    <div class="touch-top">
      <button class="touch-btn touch-back" data-action="back" aria-label="Volver">ESC</button>
      <button class="touch-btn touch-confirm" data-action="confirm" aria-label="Confirmar">OK</button>
      <button class="touch-btn touch-mute" data-action="mute" aria-label="Sonido">M</button>
      <button class="touch-btn touch-pause" data-action="pause" aria-label="Pausa">P</button>
    </div>
    <div class="touch-pad">
      <div class="touch-cluster touch-left-cluster">
        <button class="touch-btn touch-action" data-action="left" data-repeat="true" aria-label="Izquierda">&#9664;</button>
        <button class="touch-btn touch-action" data-action="right" data-repeat="true" aria-label="Derecha">&#9654;</button>
      </div>
      <div class="touch-cluster touch-right-cluster">
        <button class="touch-btn touch-action" data-action="rotate" aria-label="Rotar">&#8635;</button>
        <button class="touch-btn touch-action" data-action="softDrop" data-repeat="true" aria-label="Bajar">&#9660;</button>
        <button class="touch-btn touch-action touch-hard" data-action="hardDrop" aria-label="Caida rapida">&#10515;</button>
      </div>
    </div>
  `;
  document.body.appendChild(root);
  document.body.classList.toggle('touch-device', isCoarse);

  function getUiState() {
    return window.getGameUiState ? window.getGameUiState() : {};
  }

  function setPressed(el, pressed) {
    el.classList.toggle('is-pressed', pressed);
  }

  function send(action) {
    dispatch(action);
    if (navigator.vibrate) navigator.vibrate(8);
  }

  function startRepeat(btn) {
    const action = btn.dataset.action;
    let interval = null;
    let timeout = null;
    setPressed(btn, true);
    send(action);
    timeout = setTimeout(() => {
      interval = setInterval(() => send(action), action === 'softDrop' ? 65 : 95);
    }, 180);

    function stop() {
      setPressed(btn, false);
      clearTimeout(timeout);
      clearInterval(interval);
      btn.removeEventListener('pointerup', stop);
      btn.removeEventListener('pointercancel', stop);
      btn.removeEventListener('pointerleave', stop);
    }

    btn.addEventListener('pointerup', stop);
    btn.addEventListener('pointercancel', stop);
    btn.addEventListener('pointerleave', stop);
  }

  root.addEventListener('pointerdown', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    e.preventDefault();
    if (btn.dataset.repeat === 'true') startRepeat(btn);
    else {
      setPressed(btn, true);
      send(btn.dataset.action);
      const clear = () => setPressed(btn, false);
      btn.addEventListener('pointerup', clear, { once: true });
      btn.addEventListener('pointercancel', clear, { once: true });
      btn.addEventListener('pointerleave', clear, { once: true });
    }
  });

  let gesture = null;
  function canvasPoint(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * W,
      y: ((e.clientY - rect.top) / rect.height) * H,
    };
  }

  canvas.addEventListener('pointerdown', (e) => {
    if (!isCoarse && e.pointerType === 'mouse') return;
    const p = canvasPoint(e);
    gesture = { startX: e.clientX, startY: e.clientY, x: p.x, y: p.y, time: performance.now() };
    canvas.setPointerCapture?.(e.pointerId);
    dispatch('unlock');
  });

  canvas.addEventListener('pointerup', (e) => {
    if (!gesture) return;
    const dx = e.clientX - gesture.startX;
    const dy = e.clientY - gesture.startY;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);
    const ui = getUiState();
    if (!ui.inGame || ui.inCountdown || ui.over || ui.won) {
      dispatch({ type: 'tap', x: gesture.x, y: gesture.y });
    } else if (adx < 12 && ady < 12) {
      dispatch('rotate');
    } else if (ady > adx && dy > 34) {
      dispatch(dy > 90 ? 'hardDrop' : 'softDrop');
    } else if (adx > 28) {
      dispatch(dx < 0 ? 'left' : 'right');
    }
    gesture = null;
  });

  canvas.addEventListener('pointercancel', () => { gesture = null; });

  let lastGameControls = false;
  function refresh() {
    const ui = getUiState();
    const show = isCoarse || window.innerWidth <= 900;
    const inGameControls = show && ui.inGame && !ui.inCountdown && !ui.over && !ui.won;
    root.classList.toggle('is-visible', show);
    root.classList.toggle('show-game', inGameControls);
    root.classList.toggle('show-confirm', show && (ui.inMenu || ui.inNameEntry || ui.inDifficulty || ui.inLeaderboard || ui.inCredits));
    root.classList.toggle('show-back', show && (ui.inNameEntry || ui.inDifficulty || ui.inLeaderboard || ui.inCredits));
    root.classList.toggle('show-pause', inGameControls);
    document.body.classList.toggle('touch-game-active', inGameControls);
    if (lastGameControls !== inGameControls && window.resizeGameCanvas) {
      lastGameControls = inGameControls;
      window.resizeGameCanvas();
    }
  }
  refresh();
  window.addEventListener('resize', refresh);
  window.addEventListener('orientationchange', refresh);
  setInterval(refresh, 120);
}

window.installTouchControls = installTouchControls;
