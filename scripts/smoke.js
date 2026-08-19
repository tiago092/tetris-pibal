const { chromium } = require('playwright');
const { pathToFileURL } = require('url');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const url = pathToFileURL(path.join(process.cwd(), 'index.html')).href;
  const touchStorageKey = 'tetris-pibal.touch-controls.v1';

  async function preparePage(options, debug=false, name='Smoke', touchStorageValue) {
    const context = await browser.newContext(options);
    if (touchStorageValue !== undefined) {
      await context.addInitScript(({ key, value }) => {
        try { localStorage.setItem(key, value); } catch (_) {}
      }, { key:touchStorageKey, value:touchStorageValue });
    }
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
    page.on('console', message => {
      if (message.type() === 'error') errors.push(`console.error: ${message.text()}`);
    });
    await page.goto(debug ? `${url}?debug=1` : url, { waitUntil:'domcontentloaded' });
    if (name !== null) {
      await page.evaluate(player => {
        playerName=player;
        currentDiff=DIFFICULTIES[1];
        inMenu=false; inNameEntry=false; inDifficulty=false;
        inLeaderboard=false; inCredits=false; inCountdown=false; inTouchTutorial=false;
        state=createState();
      }, name);
    }
    return { context, page };
  }

  async function dispatchTouch(page, selector, type, x, y, pointerId=1) {
    await page.locator(selector).dispatchEvent(type, {
      pointerId,
      pointerType:'touch',
      isPrimary:true,
      clientX:x,
      clientY:y,
      button:0,
      buttons:type === 'pointerup' || type === 'pointercancel' ? 0 : 1,
    });
  }

  const desktop=await preparePage({ viewport:{ width:800,height:900 } });
  const initial=await desktop.page.evaluate(() => ({
    queue:state.nextQueue.length,
    bag:state.bag.length,
    active:state.piece.shape,
    player:playerName,
  }));
  if (initial.queue !== 1 || initial.bag !== 5) errors.push(`unexpected initial queue/bag: ${JSON.stringify(initial)}`);

  await desktop.page.evaluate(() => window.handleGameAction('hold'));
  const held=await desktop.page.evaluate(() => ({
    held:state.heldPiece && state.heldPiece.shape,
    active:state.piece.shape,
    canHold:state.canHold,
    queue:state.nextQueue.length,
  }));
  if (held.held !== initial.active || held.canHold || held.queue !== 1)
    errors.push(`hold failed: ${JSON.stringify(held)}`);

  await desktop.page.keyboard.press('KeyX');
  await desktop.page.keyboard.press('KeyZ');
  await desktop.page.evaluate(() => { state.score=1234; });
  await desktop.page.keyboard.press('KeyR');
  const restarted=await desktop.page.evaluate(() => ({ score:state.score,player:playerName,queue:state.nextQueue.length }));
  if (restarted.score !== 0 || restarted.player !== 'Smoke' || restarted.queue !== 1)
    errors.push(`restart failed: ${JSON.stringify(restarted)}`);

  const levelBefore=await desktop.page.evaluate(() => state.level);
  await desktop.page.keyboard.press('KeyN');
  const levelAfter=await desktop.page.evaluate(() => state.level);
  if (levelAfter !== levelBefore) errors.push('public N level skip is still active');
  if (await desktop.page.locator('#debugLevelButton').isVisible()) errors.push('debug button is public without ?debug=1');
  await desktop.context.close();

  const mobileOptions={ viewport:{ width:390,height:844 },hasTouch:true,isMobile:true };
  const tutorial=await preparePage(mobileOptions,false,null);
  await tutorial.page.evaluate(() => {
    playerName='Tutorial';
    inMenu=false; inNameEntry=false; inDifficulty=true;
    inLeaderboard=false; inCredits=false; inCountdown=false; inTouchTutorial=false;
    startSelectedDifficulty();
  });
  await tutorial.page.waitForTimeout(250);
  const tutorialOpen=await tutorial.page.evaluate(() => ({
    tutorial:inTouchTutorial,
    countdown:inCountdown,
    open:document.getElementById('touchControls').classList.contains('tutorial-open'),
    mode:window.__touchControlsController.getMode(),
  }));
  if (!tutorialOpen.tutorial || tutorialOpen.countdown || !tutorialOpen.open || tutorialOpen.mode !== 'gestures')
    errors.push(`first touch tutorial did not block countdown: ${JSON.stringify(tutorialOpen)}`);
  await tutorial.page.locator('[data-tutorial-mode="gestures"]').click();
  const tutorialDone=await tutorial.page.evaluate(key => ({
    tutorial:inTouchTutorial,
    countdown:inCountdown,
    willShowAgain:window.__touchControlsController.needsTutorial(),
    saved:JSON.parse(localStorage.getItem(key) || '{}'),
  }),touchStorageKey);
  if (tutorialDone.tutorial || !tutorialDone.countdown || !tutorialDone.willShowAgain || tutorialDone.saved.mode !== 'gestures' || tutorialDone.saved.tutorialVersion !== 1)
    errors.push(`touch tutorial completion failed: ${JSON.stringify(tutorialDone)}`);
  await tutorial.page.evaluate(() => {
    inCountdown=false; inMenu=false; inDifficulty=true; inTouchTutorial=false;
    startSelectedDifficulty();
  });
  const tutorialAgain=await tutorial.page.evaluate(() => ({ tutorial:inTouchTutorial,countdown:inCountdown }));
  if (!tutorialAgain.tutorial || tutorialAgain.countdown)
    errors.push(`touch tutorial was not shown on the next game: ${JSON.stringify(tutorialAgain)}`);
  await tutorial.context.close();

  const malformed=await preparePage(mobileOptions,false,'Malformed','{not-json');
  const malformedState=await malformed.page.evaluate(() => ({
    mode:window.__touchControlsController.getMode(),
    tutorial:window.__touchControlsController.needsTutorial(),
  }));
  if (malformedState.mode !== 'gestures' || !malformedState.tutorial)
    errors.push(`malformed touch settings fallback failed: ${JSON.stringify(malformedState)}`);
  await malformed.context.close();

  const gesture=await preparePage(
    mobileOptions,
    false,
    'Gesture',
    JSON.stringify({ mode:'gestures',tutorialVersion:1 })
  );
  await gesture.page.waitForTimeout(180);
  const gestureUi=await gesture.page.evaluate(() => {
    const root=document.getElementById('touchControls');
    return {
      visible:root.classList.contains('is-visible'),
      pause:root.classList.contains('show-pause'),
      buttons:root.classList.contains('show-buttons'),
      mode:window.__touchControlsController.getMode(),
    };
  });
  if (!gestureUi.visible || !gestureUi.pause || gestureUi.buttons || gestureUi.mode !== 'gestures')
    errors.push(`gesture mode UI failed: ${JSON.stringify(gestureUi)}`);

  const canvasBox=await gesture.page.locator('#c').boundingBox();
  const leftTapX=canvasBox.x+canvasBox.width*0.25;
  const rightTapX=canvasBox.x+canvasBox.width*0.75;
  const tapY=canvasBox.y+canvasBox.height*0.45;
  await gesture.page.evaluate(() => { state.piece=createPiece('T'); state.lastFall=performance.now(); });
  await dispatchTouch(gesture.page,'#c','pointerdown',leftTapX,tapY,11);
  await dispatchTouch(gesture.page,'#c','pointerup',leftTapX,tapY,11);
  const leftRotation=await gesture.page.evaluate(() => state.piece.rot);
  await gesture.page.evaluate(() => { state.piece=createPiece('T'); state.lastFall=performance.now(); });
  await dispatchTouch(gesture.page,'#c','pointerdown',rightTapX,tapY,12);
  await dispatchTouch(gesture.page,'#c','pointerup',rightTapX,tapY,12);
  const rightRotation=await gesture.page.evaluate(() => state.piece.rot);
  if (leftRotation !== 3 || rightRotation !== 1)
    errors.push(`gesture rotations failed: ${JSON.stringify({ leftRotation,rightRotation })}`);

  await gesture.page.evaluate(() => { state.piece={ ...createPiece('T'),x:1 }; state.lastFall=performance.now(); });
  const dragStartX=canvasBox.x+canvasBox.width*0.35;
  await dispatchTouch(gesture.page,'#c','pointerdown',dragStartX,tapY,13);
  await dispatchTouch(gesture.page,'#c','pointermove',dragStartX+82,tapY,13);
  await dispatchTouch(gesture.page,'#c','pointerup',dragStartX+82,tapY,13);
  const dragX=await gesture.page.evaluate(() => state.piece.x);
  if (dragX < 4) errors.push(`horizontal gesture did not move multiple columns: x=${dragX}`);

  await gesture.page.evaluate(() => {
    state=createState();
    state.piece=createPiece('T');
    state.lastFall=performance.now();
  });
  const holdX=canvasBox.x+canvasBox.width*0.5;
  const holdStartY=canvasBox.y+canvasBox.height*0.65;
  await dispatchTouch(gesture.page,'#c','pointerdown',holdX,holdStartY,14);
  await dispatchTouch(gesture.page,'#c','pointermove',holdX,holdStartY-60,14);
  await dispatchTouch(gesture.page,'#c','pointerup',holdX,holdStartY-60,14);
  const gestureHeld=await gesture.page.evaluate(() => state.heldPiece && state.heldPiece.shape);
  if (gestureHeld !== 'T') errors.push(`upward Hold gesture failed: ${gestureHeld}`);

  await gesture.page.evaluate(() => {
    window.__touchDropCounts={ soft:0,hard:0 };
    const originalSoft=softDropPiece;
    const originalHard=hardDropPiece;
    softDropPiece=function(){ window.__touchDropCounts.soft++; return originalSoft(); };
    hardDropPiece=function(){ window.__touchDropCounts.hard++; return originalHard(); };
    state=createState(); state.piece=createPiece('T'); state.lastFall=performance.now();
  });
  const dropX=canvasBox.x+canvasBox.width*0.55;
  const dropY=canvasBox.y+canvasBox.height*0.35;
  await dispatchTouch(gesture.page,'#c','pointerdown',dropX,dropY,15);
  await dispatchTouch(gesture.page,'#c','pointermove',dropX,dropY+32,15);
  await gesture.page.waitForTimeout(260);
  await dispatchTouch(gesture.page,'#c','pointerup',dropX,dropY+32,15);
  const softCounts=await gesture.page.evaluate(() => ({ ...window.__touchDropCounts }));
  if (softCounts.soft < 2 || softCounts.hard !== 0)
    errors.push(`held soft drop classification failed: ${JSON.stringify(softCounts)}`);

  await gesture.page.evaluate(() => {
    window.__touchDropCounts.soft=0; window.__touchDropCounts.hard=0;
    state=createState(); state.piece=createPiece('T'); state.lastFall=performance.now();
  });
  await dispatchTouch(gesture.page,'#c','pointerdown',dropX,dropY,16);
  await dispatchTouch(gesture.page,'#c','pointermove',dropX,dropY+90,16);
  await dispatchTouch(gesture.page,'#c','pointerup',dropX,dropY+90,16);
  const hardCounts=await gesture.page.evaluate(() => ({ ...window.__touchDropCounts }));
  if (hardCounts.soft !== 0 || hardCounts.hard !== 1)
    errors.push(`hard drop flick classification failed: ${JSON.stringify(hardCounts)}`);
  await gesture.context.close();

  const buttons=await preparePage(
    mobileOptions,
    false,
    'Buttons',
    JSON.stringify({ mode:'buttons',tutorialVersion:1 })
  );
  await buttons.page.waitForTimeout(180);
  const mobileRotations=await buttons.page.evaluate(() => ({
    clockwise:document.querySelectorAll('.touch-pad [data-action="rotateCW"]').length,
    counterclockwise:document.querySelectorAll('.touch-pad [data-action="rotateCCW"]').length,
  }));
  if (mobileRotations.clockwise !== 1 || mobileRotations.counterclockwise !== 0)
    errors.push(`mobile should expose one rotation button: ${JSON.stringify(mobileRotations)}`);
  await buttons.page.evaluate(() => { state.piece=createPiece('T'); state.lastFall=performance.now(); });
  await buttons.page.locator('.touch-pad [data-action="rotateCW"]').click();
  const buttonRotation=await buttons.page.evaluate(() => state.piece.rot);
  if (buttonRotation !== 1) errors.push(`single mobile rotation button failed: rot=${buttonRotation}`);
  await buttons.page.evaluate(() => { state.piece={ ...createPiece('T'),x:6 }; state.lastFall=performance.now(); });
  const leftButton=buttons.page.locator('[data-action="left"]');
  await leftButton.dispatchEvent('pointerdown',{ pointerId:21,pointerType:'touch',isPrimary:true,buttons:1 });
  await buttons.page.waitForTimeout(270);
  await leftButton.dispatchEvent('pointercancel',{ pointerId:21,pointerType:'touch',isPrimary:true,buttons:0 });
  const repeatedX=await buttons.page.evaluate(() => state.piece.x);
  await buttons.page.waitForTimeout(160);
  const stoppedX=await buttons.page.evaluate(() => state.piece.x);
  if (repeatedX >= 5 || stoppedX !== repeatedX)
    errors.push(`button repeat/cancel failed: ${JSON.stringify({ repeatedX,stoppedX })}`);

  await buttons.page.evaluate(() => { state=createState(); state.piece=createPiece('T'); });
  await buttons.page.locator('[data-action="hold"]').click();
  const buttonHeld=await buttons.page.evaluate(() => state.heldPiece && state.heldPiece.shape);
  if (buttonHeld !== 'T') errors.push(`button Hold failed: ${buttonHeld}`);
  await buttons.context.close();

  const pause=await preparePage(
    mobileOptions,
    false,
    'Pause',
    JSON.stringify({ mode:'gestures',tutorialVersion:1 })
  );
  await pause.page.waitForTimeout(180);
  await pause.page.locator('.touch-pause').click();
  await pause.page.waitForTimeout(150);
  const paused=await pause.page.evaluate(() => ({
    paused:state.paused,
    menu:document.getElementById('touchControls').classList.contains('show-pause-menu'),
  }));
  if (!paused.paused || !paused.menu) errors.push(`touch pause menu failed: ${JSON.stringify(paused)}`);
  await pause.page.locator('[data-touch-mode="buttons"]').click();
  await pause.page.locator('.touch-pause-dialog [data-action="pause"]').click();
  await pause.page.waitForTimeout(150);
  const resumed=await pause.page.evaluate(key => ({
    paused:state.paused,
    mode:window.__touchControlsController.getMode(),
    buttons:document.getElementById('touchControls').classList.contains('show-buttons'),
    saved:JSON.parse(localStorage.getItem(key) || '{}').mode,
  }),touchStorageKey);
  if (resumed.paused || resumed.mode !== 'buttons' || !resumed.buttons || resumed.saved !== 'buttons')
    errors.push(`pause mode switch/resume failed: ${JSON.stringify(resumed)}`);

  await pause.page.locator('.touch-pause').click();
  await pause.page.waitForTimeout(150);
  const mutedBefore=await pause.page.evaluate(() => musicMuted);
  await pause.page.locator('.touch-sound-toggle').click();
  const mutedAfter=await pause.page.evaluate(() => musicMuted);
  if (mutedAfter === mutedBefore) errors.push('pause sound toggle failed');
  await pause.page.evaluate(() => { state.score=4321; });
  await pause.page.locator('[data-touch-command="request-restart"]').click();
  const confirming=await pause.page.locator('.touch-pause-dialog').evaluate(el => el.classList.contains('is-confirming-restart'));
  const scoreBeforeConfirm=await pause.page.evaluate(() => state.score);
  if (!confirming || scoreBeforeConfirm !== 4321) errors.push('restart confirmation did not protect current game');
  await pause.page.locator('.touch-restart-confirm [data-action="restart"]').click();
  await pause.page.waitForTimeout(150);
  const pauseRestarted=await pause.page.evaluate(() => ({ score:state.score,paused:state.paused }));
  if (pauseRestarted.score !== 0 || pauseRestarted.paused)
    errors.push(`confirmed touch restart failed: ${JSON.stringify(pauseRestarted)}`);
  await pause.page.locator('.touch-pause').click();
  await pause.page.waitForTimeout(150);
  await pause.page.locator('[data-touch-command="request-menu"]').click();
  const menuConfirming=await pause.page.locator('.touch-pause-dialog').evaluate(el => el.classList.contains('is-confirming-menu'));
  const menuBeforeConfirm=await pause.page.evaluate(() => inMenu);
  if (!menuConfirming || menuBeforeConfirm) errors.push('main-menu confirmation did not protect current game');
  await pause.page.locator('.touch-menu-confirm [data-action="menu"]').click();
  await pause.page.waitForTimeout(150);
  const returnedToMenu=await pause.page.evaluate(() => ({
    menu:inMenu,
    pauseMenu:document.getElementById('touchControls').classList.contains('show-pause-menu'),
  }));
  if (!returnedToMenu.menu || returnedToMenu.pauseMenu)
    errors.push(`touch main-menu action failed: ${JSON.stringify(returnedToMenu)}`);
  await pause.context.close();

  for (const viewport of [
    { width:320,height:568 },
    { width:360,height:640 },
    { width:375,height:667 },
    { width:390,height:844 },
    { width:430,height:932 },
    { width:844,height:390 },
  ]) {
    const audit=await preparePage(
      { viewport,hasTouch:true,isMobile:true },
      false,
      `Layout${viewport.width}`,
      JSON.stringify({ mode:'buttons',tutorialVersion:1 })
    );
    await audit.page.waitForTimeout(180);
    const layout=await audit.page.evaluate(() => {
      const root=document.getElementById('touchControls');
      const canvasRect=document.getElementById('c').getBoundingClientRect();
      const padRect=root.querySelector('.touch-pad').getBoundingClientRect();
      const controls=[...root.querySelectorAll('.touch-pad button, .touch-pause')]
        .filter(button => getComputedStyle(button).display !== 'none')
        .map(button => {
          const rect=button.getBoundingClientRect();
          return { action:button.dataset.action,x:rect.x,y:rect.y,width:rect.width,height:rect.height,right:rect.right,bottom:rect.bottom };
        });
      return {
        viewport:{ width:innerWidth,height:innerHeight },
        canvas:{ x:canvasRect.x,y:canvasRect.y,width:canvasRect.width,height:canvasRect.height,right:canvasRect.right,bottom:canvasRect.bottom },
        pad:{ x:padRect.x,y:padRect.y,width:padRect.width,height:padRect.height,right:padRect.right,bottom:padRect.bottom },
        controls,
        showButtons:root.classList.contains('show-buttons'),
        scroll:{ width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight },
      };
    });
    const label=`${viewport.width}x${viewport.height}`;
    if (!layout.showButtons || layout.canvas.bottom > layout.pad.y-7)
      errors.push(`mobile layout overlaps at ${label}: ${JSON.stringify(layout)}`);
    if (layout.scroll.width > viewport.width || layout.scroll.height > viewport.height)
      errors.push(`mobile layout scrolls at ${label}: ${JSON.stringify(layout.scroll)}`);
    for (const control of layout.controls) {
      if (control.width < 48 || control.height < 48 || control.x < 0 || control.y < 0 || control.right > viewport.width || control.bottom > viewport.height)
        errors.push(`invalid ${control.action} target at ${label}: ${JSON.stringify(control)}`);
    }
    for (let i=0; i<layout.controls.length; i++) {
      for (let j=i+1; j<layout.controls.length; j++) {
        const a=layout.controls[i], b=layout.controls[j];
        const overlapX=Math.min(a.right,b.right)-Math.max(a.x,b.x);
        const overlapY=Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y);
        if (overlapX > 0 && overlapY > 0)
          errors.push(`touch targets overlap at ${label}: ${a.action}/${b.action}`);
      }
    }
    await audit.page.evaluate(() => window.__touchControlsController.setMode('gestures'));
    await audit.page.waitForTimeout(80);
    const gestureLayout=await audit.page.evaluate(() => {
      const canvasRect=document.getElementById('c').getBoundingClientRect();
      const pauseRect=document.querySelector('.touch-pause').getBoundingClientRect();
      return {
        canvas:{ x:canvasRect.x,y:canvasRect.y,right:canvasRect.right,bottom:canvasRect.bottom },
        pause:{ x:pauseRect.x,y:pauseRect.y,right:pauseRect.right,bottom:pauseRect.bottom },
      };
    });
    const gestureOverlapX=Math.min(gestureLayout.canvas.right,gestureLayout.pause.right)-Math.max(gestureLayout.canvas.x,gestureLayout.pause.x);
    const gestureOverlapY=Math.min(gestureLayout.canvas.bottom,gestureLayout.pause.bottom)-Math.max(gestureLayout.canvas.y,gestureLayout.pause.y);
    if (gestureOverlapX > 0 && gestureOverlapY > 0)
      errors.push(`gesture pause overlaps canvas at ${label}: ${JSON.stringify(gestureLayout)}`);
    await audit.context.close();
  }

  const debug=await preparePage({ viewport:{ width:800,height:900 } },true,'DebugSmoke');
  await debug.page.evaluate(() => {
    window.__debugSaveCalls=0;
    const originalSaveScore=saveScore;
    saveScore=entry => {
      window.__debugSaveCalls++;
      return originalSaveScore(entry);
    };
  });
  await debug.page.locator('#debugLevelButton').waitFor({ state:'visible' });
  await debug.page.keyboard.press('KeyN');
  for (let i=0;i<5;i++) await debug.page.locator('#debugLevelButton').click();
  await debug.page.waitForTimeout(3000);
  const debugWin=await debug.page.evaluate(() => ({
    levelCount:LEVELS.length,
    level:state.level,
    lines:state.lines,
    won:state.won,
    debugUsed:state.debugUsed,
    saveCalls:window.__debugSaveCalls,
    savedScores:loadScores().filter(entry=>entry.name==='DebugSmoke').length,
    levelMusicStopped:musicEl===null,
    winVideoPlaying:!winVideo.paused,
    buttonHidden:document.getElementById('debugLevelButton').hidden,
  }));
  if (debugWin.level !== debugWin.levelCount || debugWin.lines !== debugWin.levelCount*15 || !debugWin.won || !debugWin.debugUsed)
    errors.push(`debug level progression failed: ${JSON.stringify(debugWin)}`);
  if (debugWin.saveCalls || debugWin.savedScores)
    errors.push(`debug victory contaminated ranking: ${JSON.stringify(debugWin)}`);
  if (!debugWin.levelMusicStopped || !debugWin.winVideoPlaying || !debugWin.buttonHidden)
    errors.push(`debug victory transition incomplete: ${JSON.stringify(debugWin)}`);
  await debug.context.close();

  await browser.close();

  if (errors.length) {
    console.error(errors.join('\n'));
    process.exit(1);
  }
  console.log('OK: desktop, touch modes/layout and debug-victory gameplay smoke tests');
})().catch(error => {
  console.error(error.stack || error);
  process.exit(1);
});
