const assert = require('assert');
const { readFileSync } = require('fs');
const { join } = require('path');
const vm = require('vm');

const constants = readFileSync(join(process.cwd(), 'js/constants.js'), 'utf8');
const game = readFileSync(join(process.cwd(), 'js/game.js'), 'utf8');

const tests = String.raw`
(() => {
  const emptyBoard = () => Array.from({length:ROWS},()=>Array(COLS).fill(null));
  const makeState = (piece=createPiece('T')) => ({
    board:emptyBoard(), bag:[], nextQueue:[], heldPiece:null, canHold:true,
    piece, over:false, won:false, clearingRows:null, groundedAt:null,
    lockResets:0, lastFall:0,
  });

  // Bolsa de 7: cada bloque consecutivo contiene las siete formas una vez.
  let seed=123456789;
  const random=()=>((seed=(seed*1664525+1013904223)>>>0)/0x100000000);
  const bagState={ bag:[] };
  const sequence=Array.from({length:21},()=>takeNextShape(bagState,random));
  for (let offset=0;offset<sequence.length;offset+=7)
    assert.deepStrictEqual([...new Set(sequence.slice(offset,offset+7))].sort(),Object.keys(PIECES).sort());

  // El borrado múltiple conserva 20 filas y no pierde las filas superiores.
  const board=emptyBoard();
  board[0][0]='marker';
  board[18].fill('x'); board[19].fill('x');
  clearLines(board,[18,19]);
  assert.strictEqual(board.length,ROWS);
  assert.strictEqual(board[2][0],'marker');
  assert.ok(board[0].every(cell=>cell===null) && board[1].every(cell=>cell===null));

  // Hold consume la primera pieza de la cola, se bloquea y se reactiva tras fijar.
  const holdState=makeState(createPiece('L'));
  holdState.nextQueue=[createPiece('I')];
  holdState.bag=['O','T','S','Z','J'];
  assert.strictEqual(holdCurrentPiece(holdState,100,random),true);
  assert.strictEqual(holdState.heldPiece.shape,'L');
  assert.strictEqual(holdState.piece.shape,'I');
  assert.strictEqual(holdState.nextQueue.length,NEXT_QUEUE_SIZE);
  assert.strictEqual(holdState.canHold,false);
  assert.strictEqual(holdCurrentPiece(holdState,110,random),false);
  activateNextPiece(holdState,200,random);
  assert.strictEqual(holdState.canHold,true);
  assert.strictEqual(holdCurrentPiece(holdState,210,random),true);
  assert.strictEqual(holdState.piece.shape,'L');
  assert.strictEqual(holdState.heldPiece.shape,'O');

  // Un intercambio que no cabe marca game over.
  const blockedHold=makeState(createPiece('L'));
  blockedHold.heldPiece=createPiece('T');
  blockedHold.nextQueue=[createPiece('I')];
  blockedHold.board[0][4]='x';
  holdCurrentPiece(blockedHold,0,random);
  assert.strictEqual(blockedHold.over,true);

  // SRS desplaza T e I desde la pared y levanta una T desde el suelo.
  const wallBoard=emptyBoard();
  const tWall=tryRotate(wallBoard,{ shape:'T',rot:1,x:-1,y:5 },-1);
  assert.ok(tWall && tWall.rot===0 && tWall.x===0);
  const iWall=tryRotate(wallBoard,{ shape:'I',rot:1,x:-2,y:5 },-1);
  assert.ok(iWall && iWall.rot===0 && iWall.x===0);
  const tFloor=tryRotate(wallBoard,{ shape:'T',rot:0,x:3,y:18 },1);
  assert.ok(tFloor && tFloor.rot===1 && tFloor.y===17);

  // Lock delay: 500 ms, reiniciable hasta 15 manipulaciones.
  const lockState=makeState({ shape:'O',rot:0,x:3,y:18 });
  assert.strictEqual(lockDelayExpired(lockState,100),false);
  assert.strictEqual(lockState.groundedAt,100);
  assert.strictEqual(lockDelayExpired(lockState,599),false);
  assert.strictEqual(lockDelayExpired(lockState,600),true);

  lockState.groundedAt=0; lockState.lockResets=0;
  applySuccessfulManipulation(lockState,{ ...lockState.piece,x:4 },400);
  assert.strictEqual(lockState.lockResets,1);
  assert.strictEqual(lockState.groundedAt,400);
  assert.strictEqual(lockDelayExpired(lockState,899),false);
  assert.strictEqual(lockDelayExpired(lockState,900),true);

  lockState.groundedAt=0; lockState.lockResets=MAX_LOCK_RESETS;
  applySuccessfulManipulation(lockState,{ ...lockState.piece,x:3 },400);
  assert.strictEqual(lockState.groundedAt,0);
  assert.strictEqual(lockDelayExpired(lockState,500),true);

  const fallingState=makeState({ shape:'O',rot:0,x:3,y:17 });
  assert.strictEqual(gravityStep(fallingState,250),true);
  assert.strictEqual(fallingState.piece.y,18);
  assert.strictEqual(fallingState.groundedAt,250);

  // Eventos especiales no alteran la tabla histórica de puntuación.
  assert.deepStrictEqual(LINE_SCORES,{1:100,2:300,3:500,4:800});
  const perfectBoard=emptyBoard(); perfectBoard[19].fill('x');
  assert.strictEqual(isPerfectClearAfterRows(perfectBoard,[19]),true);
  perfectBoard[18][0]='x';
  assert.strictEqual(isPerfectClearAfterRows(perfectBoard,[19]),false);

})();
`;

const context = vm.createContext({
  assert,
  console,
  performance:{ now:()=>0 },
  navigator:{ vibrate:()=>{} },
});

vm.runInContext(`${constants}\n${game}\n${tests}`, context, { filename:'game-logic.bundle.js' });
console.log('OK: deterministic game rules');
