const { chromium } = require('playwright');
const { pathToFileURL } = require('url');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const url = pathToFileURL(path.join(process.cwd(), 'index.html')).href;

  async function preparePage(options) {
    const context = await browser.newContext(options);
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
    page.on('console', message => {
      if (message.type() === 'error') errors.push(`console.error: ${message.text()}`);
    });
    await page.goto(url, { waitUntil:'domcontentloaded' });
    await page.evaluate(() => {
      playerName='Smoke';
      currentDiff=DIFFICULTIES[1];
      inMenu=false; inNameEntry=false; inDifficulty=false;
      inLeaderboard=false; inCredits=false; inCountdown=false;
      state=createState();
    });
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

  await browser.close();

  if (errors.length) {
    console.error(errors.join('\n'));
    process.exit(1);
  }
  console.log('OK: desktop and mobile gameplay smoke tests');
})().catch(error => {
  console.error(error.stack || error);
  process.exit(1);
});
