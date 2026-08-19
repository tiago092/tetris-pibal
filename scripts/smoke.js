const { chromium } = require('playwright');
const { pathToFileURL } = require('url');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const url = pathToFileURL(path.join(process.cwd(), 'index.html')).href;

  async function preparePage(options, debug=false, name='Smoke') {
    const context = await browser.newContext(options);
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
    page.on('console', message => {
      if (message.type() === 'error') errors.push(`console.error: ${message.text()}`);
    });
    await page.goto(debug ? `${url}?debug=1` : url, { waitUntil:'domcontentloaded' });
    await page.evaluate(player => {
      playerName=player;
      currentDiff=DIFFICULTIES[1];
      inMenu=false; inNameEntry=false; inDifficulty=false;
      inLeaderboard=false; inCredits=false; inCountdown=false;
      state=createState();
    }, name);
    return { context, page };
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

  const mobile=await preparePage({ viewport:{ width:390,height:844 },hasTouch:true,isMobile:true });
  await mobile.page.waitForTimeout(180);
  const touch=await mobile.page.evaluate(() => {
    const root=document.getElementById('touchControls');
    return {
      visible:root.classList.contains('is-visible'),
      game:root.classList.contains('show-game'),
      hold:!!root.querySelector('[data-action="hold"]'),
      ccw:!!root.querySelector('[data-action="rotateCCW"]'),
      restart:!!root.querySelector('[data-action="restart"]'),
    };
  });
  if (!touch.visible || !touch.game || !touch.hold || !touch.ccw || !touch.restart)
    errors.push(`mobile controls incomplete: ${JSON.stringify(touch)}`);
  await mobile.page.locator('[data-action="hold"]').dispatchEvent('pointerdown');
  const mobileHeld=await mobile.page.evaluate(() => !!state.heldPiece && !state.canHold);
  if (!mobileHeld) errors.push('mobile Hold action failed');
  await mobile.context.close();

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
  console.log('OK: desktop, mobile and debug-victory gameplay smoke tests');
})().catch(error => {
  console.error(error.stack || error);
  process.exit(1);
});
