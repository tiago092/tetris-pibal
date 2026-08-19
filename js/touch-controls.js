// ---- Controles tactiles moviles ----
function installTouchControls({ canvas, dispatch }) {
  if (!canvas || !dispatch) return null;
  if (window.__touchControlsInstalled) return window.__touchControlsController || null;
  window.__touchControlsInstalled = true;

  const cfg = TOUCH_CONFIG;
  const isCoarse = window.matchMedia('(pointer: coarse)').matches;
  const validModes = new Set(['gestures', 'buttons']);

  function loadSettings() {
    try {
      const parsed = JSON.parse(localStorage.getItem(cfg.storageKey) || '{}');
      return {
        mode: validModes.has(parsed.mode) ? parsed.mode : cfg.defaultMode,
        tutorialVersion: Number.isInteger(parsed.tutorialVersion) ? parsed.tutorialVersion : 0,
      };
    } catch (_) {
      return { mode: cfg.defaultMode, tutorialVersion: 0 };
    }
  }

  let settings = loadSettings();
  let tutorialCallback = null;
  let gesture = null;
  let lastLayoutSignature = '';
  const activeButtons = new Map();

  function saveSettings() {
    try {
      localStorage.setItem(cfg.storageKey, JSON.stringify(settings));
    } catch (_) {
      // El juego sigue funcionando aunque el navegador bloquee localStorage.
    }
  }

  const root = document.createElement('div');
  root.id = 'touchControls';
  root.innerHTML = `
    <div class="touch-top">
      <button class="touch-btn touch-back" data-action="back" aria-label="Volver">ESC</button>
      <button class="touch-btn touch-confirm" data-action="confirm" aria-label="Confirmar">OK</button>
      <button class="touch-btn touch-mute" data-action="mute" aria-label="Alternar sonido">M</button>
      <button class="touch-btn touch-pause" data-action="pause" aria-label="Pausa">Ⅱ</button>
      <button class="touch-btn touch-gameover-restart" data-action="restart" aria-label="Reintentar">↻</button>
    </div>
    <div class="touch-pad" aria-label="Controles de juego">
      <div class="touch-cluster touch-left-cluster">
        <button class="touch-btn touch-action" data-action="left" data-repeat="true" aria-label="Izquierda">&#9664;</button>
        <button class="touch-btn touch-action" data-action="right" data-repeat="true" aria-label="Derecha">&#9654;</button>
        <button class="touch-btn touch-action touch-hold" data-action="hold" aria-label="Guardar pieza">HOLD</button>
      </div>
      <div class="touch-cluster touch-right-cluster">
        <button class="touch-btn touch-action touch-rotate" data-action="rotateCW" aria-label="Girar">&#8635;</button>
        <button class="touch-btn touch-action" data-action="softDrop" data-repeat="true" aria-label="Bajar">&#9660;</button>
        <button class="touch-btn touch-action touch-hard" data-action="hardDrop" aria-label="Caída rápida">&#10515;</button>
      </div>
    </div>
    <div class="touch-layer touch-tutorial-layer" role="dialog" aria-modal="true" aria-labelledby="touchTutorialTitle">
      <div class="touch-dialog">
        <h2 id="touchTutorialTitle">CONTROLES TÁCTILES</h2>
        <p class="touch-dialog-copy">Jugá sobre el tablero sin taparlo con botones.</p>
        <div class="touch-gesture-list">
          <div class="touch-gesture"><strong>↔</strong><span>Arrastrá para mover</span></div>
          <div class="touch-gesture"><strong>↶ &nbsp; ↷</strong><span>Toque izquierdo / derecho</span></div>
          <div class="touch-gesture"><strong>↓</strong><span>Mantené para bajar<br>Flick para soltar</span></div>
          <div class="touch-gesture"><strong>↑</strong><span>Deslizá para HOLD</span></div>
        </div>
        <div class="touch-dialog-actions">
          <button class="touch-dialog-button primary" data-tutorial-mode="gestures">JUGAR CON GESTOS</button>
          <button class="touch-dialog-button" data-tutorial-mode="buttons">USAR BOTONES</button>
        </div>
      </div>
    </div>
    <div class="touch-layer touch-pause-layer" role="dialog" aria-modal="true" aria-labelledby="touchPauseTitle">
      <div class="touch-dialog touch-pause-dialog">
        <h2 id="touchPauseTitle">PAUSA</h2>
        <button class="touch-dialog-button primary" data-action="pause">CONTINUAR</button>
        <span class="touch-mode-label">MODO DE CONTROL</span>
        <div class="touch-mode-picker">
          <button class="touch-dialog-button" data-touch-mode="gestures">GESTOS</button>
          <button class="touch-dialog-button" data-touch-mode="buttons">BOTONES</button>
        </div>
        <div class="touch-pause-actions">
          <button class="touch-dialog-button touch-sound-toggle" data-action="mute">SONIDO</button>
          <button class="touch-dialog-button touch-danger touch-restart-request" data-touch-command="request-restart">REINICIAR</button>
        </div>
        <div class="touch-restart-confirm">
          <button class="touch-dialog-button touch-danger" data-action="restart">SÍ, REINICIAR</button>
          <button class="touch-dialog-button" data-touch-command="cancel-restart">CANCELAR</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(root);
  document.body.classList.toggle('touch-device', isCoarse);

  const pad = root.querySelector('.touch-pad');
  const tutorialLayer = root.querySelector('.touch-tutorial-layer');
  const pauseDialog = root.querySelector('.touch-pause-dialog');
  const soundButton = root.querySelector('.touch-sound-toggle');

  function getUiState() {
    return window.getGameUiState ? window.getGameUiState() : {};
  }

  function isTouchViewport() {
    return isCoarse || window.innerWidth <= 900;
  }

  function vibrate() {
    if (!navigator.vibrate) return;
    try { navigator.vibrate(cfg.hapticMs); } catch (_) {}
  }

  function send(action, withHaptic=false) {
    dispatch(action);
    if (withHaptic) vibrate();
  }

  function setPressed(el, pressed) {
    el.classList.toggle('is-pressed', pressed);
  }

  function stopButton(pointerId) {
    const active = activeButtons.get(pointerId);
    if (!active) return;
    clearTimeout(active.timeout);
    clearInterval(active.interval);
    setPressed(active.button, false);
    activeButtons.delete(pointerId);
  }

  function stopAllButtons() {
    for (const pointerId of [...activeButtons.keys()]) stopButton(pointerId);
  }

  function startActionButton(button, event) {
    const action = button.dataset.action;
    const repeats = button.dataset.repeat === 'true';
    if (!action || activeButtons.has(event.pointerId)) return;

    const active = { button, timeout:null, interval:null };
    activeButtons.set(event.pointerId, active);
    setPressed(button, true);
    try { button.setPointerCapture(event.pointerId); } catch (_) {}
    send(action, true);

    if (repeats) {
      const repeatMs = action === 'softDrop' ? cfg.buttonSoftDropRepeatMs : cfg.buttonMoveRepeatMs;
      active.timeout = setTimeout(() => {
        active.interval = setInterval(() => send(action, false), repeatMs);
      }, cfg.buttonRepeatDelayMs);
    }
  }

  function syncModeButtons() {
    root.querySelectorAll('[data-touch-mode]').forEach(button => {
      const selected = button.dataset.touchMode === settings.mode;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  }

  function setMode(mode) {
    if (!validModes.has(mode) || settings.mode === mode) return;
    stopAllButtons();
    stopGesture();
    settings = { ...settings, mode };
    saveSettings();
    syncModeButtons();
    refresh(true);
  }

  function finishTutorial(mode) {
    if (validModes.has(mode)) setMode(mode);
    settings = { ...settings, tutorialVersion:cfg.tutorialVersion };
    saveSettings();
    root.classList.remove('tutorial-open');
    const callback = tutorialCallback;
    tutorialCallback = null;
    refresh(true);
    if (callback) callback(settings.mode);
  }

  root.addEventListener('pointerdown', event => {
    const tutorialChoice = event.target.closest('[data-tutorial-mode]');
    if (tutorialChoice) {
      event.preventDefault();
      finishTutorial(tutorialChoice.dataset.tutorialMode);
      return;
    }

    const modeButton = event.target.closest('[data-touch-mode]');
    if (modeButton) {
      event.preventDefault();
      setMode(modeButton.dataset.touchMode);
      return;
    }

    const commandButton = event.target.closest('[data-touch-command]');
    if (commandButton) {
      event.preventDefault();
      if (commandButton.dataset.touchCommand === 'request-restart') pauseDialog.classList.add('is-confirming');
      else pauseDialog.classList.remove('is-confirming');
      return;
    }

    const actionButton = event.target.closest('button[data-action]');
    if (!actionButton) return;
    event.preventDefault();
    event.stopPropagation();
    startActionButton(actionButton, event);
    if (actionButton.dataset.action === 'mute') refresh(true);
  });
  root.addEventListener('pointerup', event => stopButton(event.pointerId));
  root.addEventListener('pointercancel', event => stopButton(event.pointerId));
  root.addEventListener('lostpointercapture', event => stopButton(event.pointerId));

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * W,
      y: ((event.clientY - rect.top) / rect.height) * H,
    };
  }

  function clearGestureTimers(current) {
    if (!current) return;
    clearTimeout(current.softTimeout);
    clearInterval(current.softInterval);
    current.softTimeout = null;
    current.softInterval = null;
  }

  function stopGesture() {
    clearGestureTimers(gesture);
    gesture = null;
  }

  function gameplayGesturesAllowed(ui=getUiState()) {
    return settings.mode === 'gestures' && ui.inGame && !ui.paused && !ui.over && !ui.won && !ui.inTouchTutorial;
  }

  function gestureMoveStep() {
    const rect = canvas.getBoundingClientRect();
    const renderedCell = (rect.width / W) * CS;
    return Math.max(cfg.minMoveStepPx, renderedCell * cfg.moveStepCellRatio);
  }

  function cancelPendingSoft(current) {
    clearTimeout(current.softTimeout);
    current.softTimeout = null;
  }

  function startSoftDrop(current) {
    if (gesture !== current || current.softStarted || current.horizontalMoved || !gameplayGesturesAllowed()) return;
    const dx = current.currentX - current.startX;
    const dy = current.currentY - current.startY;
    if (dy < cfg.softDropDistancePx || Math.abs(dy) <= Math.abs(dx) * cfg.gestureDominance) return;
    current.softStarted = true;
    send('softDrop', false);
    current.softInterval = setInterval(() => send('softDrop', false), cfg.softDropRepeatMs);
  }

  function scheduleSoftDrop(current) {
    if (current.softStarted || current.softTimeout || current.horizontalMoved) return;
    const elapsed = performance.now() - current.startTime;
    current.softTimeout = setTimeout(() => {
      current.softTimeout = null;
      startSoftDrop(current);
    }, Math.max(0, cfg.softDropHoldMs - elapsed));
  }

  function processHorizontal(current) {
    const totalDx = current.currentX - current.startX;
    const totalDy = current.currentY - current.startY;
    if (Math.abs(totalDx) <= Math.abs(totalDy) * cfg.gestureDominance) return false;

    const step = gestureMoveStep();
    const delta = current.currentX - current.lastStepX;
    const count = Math.floor(Math.abs(delta) / step);
    if (!count) return false;

    const direction = delta < 0 ? -1 : 1;
    cancelPendingSoft(current);
    current.horizontalMoved = true;
    current.lastStepX += direction * count * step;
    for (let i=0; i<count; i++) send(direction < 0 ? 'left' : 'right', false);
    return true;
  }

  canvas.addEventListener('pointerdown', event => {
    if (!isCoarse && event.pointerType === 'mouse') return;
    const ui = getUiState();
    if (ui.inTouchTutorial || gesture || (ui.inGame && settings.mode === 'buttons')) return;

    const point = canvasPoint(event);
    gesture = {
      pointerId:event.pointerId,
      startX:event.clientX,
      startY:event.clientY,
      currentX:event.clientX,
      currentY:event.clientY,
      lastStepX:event.clientX,
      x:point.x,
      y:point.y,
      startTime:performance.now(),
      horizontalMoved:false,
      softStarted:false,
      softTimeout:null,
      softInterval:null,
    };
    try { canvas.setPointerCapture(event.pointerId); } catch (_) {}
    dispatch('unlock');
  });

  canvas.addEventListener('pointermove', event => {
    if (!gesture || gesture.pointerId !== event.pointerId || !gameplayGesturesAllowed()) return;
    event.preventDefault();
    gesture.currentX = event.clientX;
    gesture.currentY = event.clientY;
    if (processHorizontal(gesture)) return;

    const dx = gesture.currentX - gesture.startX;
    const dy = gesture.currentY - gesture.startY;
    if (dy >= cfg.softDropDistancePx && Math.abs(dy) > Math.abs(dx) * cfg.gestureDominance) scheduleSoftDrop(gesture);
    else if (!gesture.softStarted) cancelPendingSoft(gesture);
  });

  canvas.addEventListener('pointerup', event => {
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const current = gesture;
    current.currentX = event.clientX;
    current.currentY = event.clientY;
    const ui = getUiState();

    if (gameplayGesturesAllowed(ui)) processHorizontal(current);
    const wasSoftDrop = current.softStarted;
    clearGestureTimers(current);
    gesture = null;

    if (!ui.inGame || ui.inCountdown || ui.over || ui.won) {
      dispatch({ type:'tap', x:current.x, y:current.y });
      return;
    }
    if (settings.mode !== 'gestures' || ui.paused || current.horizontalMoved || wasSoftDrop) return;

    const dx = event.clientX - current.startX;
    const dy = event.clientY - current.startY;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);
    const duration = Math.max(1, performance.now() - current.startTime);
    const vertical = ady > adx * cfg.gestureDominance;

    if (adx <= cfg.tapSlopPx && ady <= cfg.tapSlopPx) {
      const rect = canvas.getBoundingClientRect();
      send(event.clientX < rect.left + rect.width / 2 ? 'rotateCCW' : 'rotateCW', true);
    } else if (vertical && dy <= -cfg.holdDistancePx) {
      send('hold', true);
    } else if (vertical && dy >= cfg.hardDropDistancePx && duration <= cfg.hardDropMaxMs && dy / duration >= cfg.hardDropVelocityPxMs) {
      send('hardDrop', true);
    } else if (vertical && dy >= cfg.softDropDistancePx) {
      send('softDrop', false);
    }
  });

  canvas.addEventListener('pointercancel', event => {
    if (gesture && gesture.pointerId === event.pointerId) stopGesture();
  });

  function getLayoutInsets() {
    if (!root.classList.contains('show-buttons')) return { top:0, bottom:0 };
    const rect = pad.getBoundingClientRect();
    if (!rect.height) return { top:0, bottom:0 };
    return { top:0, bottom:Math.ceil(window.innerHeight - rect.top + cfg.layoutGapPx) };
  }

  function refresh(force=false) {
    const ui = getUiState();
    const show = isTouchViewport();
    const inGame = show && ui.inGame && !ui.inCountdown && !ui.over && !ui.won && !ui.inTouchTutorial;
    const activeGame = inGame && !ui.paused;
    const pauseMenu = inGame && ui.paused;

    root.classList.toggle('is-visible', show || root.classList.contains('tutorial-open'));
    root.classList.toggle('show-buttons', activeGame && settings.mode === 'buttons');
    root.classList.toggle('show-pause', activeGame);
    root.classList.toggle('show-pause-menu', pauseMenu);
    root.classList.toggle('show-confirm', show && !ui.inGame && !ui.inTouchTutorial && (ui.inMenu || ui.inNameEntry || ui.inDifficulty || ui.inLeaderboard || ui.inCredits));
    root.classList.toggle('show-back', show && !ui.inGame && !ui.inTouchTutorial && (ui.inNameEntry || ui.inDifficulty || ui.inLeaderboard || ui.inCredits));
    root.classList.toggle('show-mute', show && !ui.inGame && !ui.inTouchTutorial);
    root.classList.toggle('show-gameover-restart', show && ui.over);
    document.body.classList.toggle('touch-game-active', activeGame);
    document.body.classList.toggle('touch-buttons-active', activeGame && settings.mode === 'buttons');

    if (!activeGame) stopAllButtons();
    if (!gameplayGesturesAllowed(ui)) stopGesture();
    if (!pauseMenu) pauseDialog.classList.remove('is-confirming');
    soundButton.textContent = ui.muted ? 'SONIDO: NO' : 'SONIDO: SÍ';
    soundButton.setAttribute('aria-pressed', String(!ui.muted));
    syncModeButtons();

    const signature = [show, inGame, ui.paused, ui.inTouchTutorial, settings.mode, window.innerWidth, window.innerHeight].join('|');
    if ((force || signature !== lastLayoutSignature) && window.resizeGameCanvas) {
      lastLayoutSignature = signature;
      window.resizeGameCanvas();
    }
  }

  const controller = {
    getMode: () => settings.mode,
    setMode,
    needsTutorial: () => isCoarse && settings.tutorialVersion < cfg.tutorialVersion,
    presentTutorial(onComplete) {
      if (!isCoarse) {
        if (onComplete) onComplete(settings.mode);
        return false;
      }
      tutorialCallback = onComplete || null;
      root.classList.add('tutorial-open', 'is-visible');
      tutorialLayer.scrollTop = 0;
      refresh(true);
      return true;
    },
    getLayoutInsets,
  };

  window.__touchControlsController = controller;
  refresh(true);
  window.addEventListener('resize', () => refresh(true));
  window.addEventListener('orientationchange', () => refresh(true));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopAllButtons();
      stopGesture();
    }
  });
  setInterval(refresh, 120);
  return controller;
}

window.installTouchControls = installTouchControls;
