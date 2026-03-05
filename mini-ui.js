(() => {
  const engine = new ChessEngine();
  const ai = new ChessAI(engine);

  const boardEl = document.getElementById('mini-board');
  const statusEl = document.getElementById('mini-status');
  const newBtn = document.getElementById('mini-new');
  const promoEl = document.getElementById('mini-promo');
  const promoChoicesEl = document.getElementById('mini-promo-choices');

  let selected = null;
  let legalFromSelected = [];
  let lastMove = null;
  let pendingPromotion = null;

  function render() {
    renderBoard();
    renderStatus();
  }

  function renderBoard() {
    boardEl.innerHTML = '';
    const inCheck = engine.isInCheck(engine.turn);
    const [kr, kc] = engine.findKing(engine.turn);

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const sq = document.createElement('div');
        sq.className = 'mini-square ' + ((r + c) % 2 === 0 ? 'light' : 'dark');
        sq.dataset.r = r;
        sq.dataset.c = c;

        if (selected && selected[0] === r && selected[1] === c) sq.classList.add('selected');
        if (lastMove) {
          if (lastMove.fr === r && lastMove.fc === c) sq.classList.add('last-move-from');
          if (lastMove.tr === r && lastMove.tc === c) sq.classList.add('last-move-to');
        }
        if (inCheck && r === kr && c === kc) sq.classList.add('in-check');

        const isLegalTarget = legalFromSelected.some(m => m.tr === r && m.tc === c);
        if (isLegalTarget) {
          const piece = engine.board[r][c];
          sq.classList.add(piece ? 'legal-capture' : 'legal-move');
        }

        const p = engine.board[r][c];
        if (p) {
          const span = document.createElement('span');
          span.className = 'mini-piece ' + (p.color === WHITE ? 'white' : 'black');
          span.textContent = PIECE_UNICODE[p.color + p.type];
          sq.appendChild(span);
        }

        sq.addEventListener('click', () => onSquareClick(r, c));
        boardEl.appendChild(sq);
      }
    }
  }

  function onSquareClick(r, c) {
    if (engine.gameOver || engine.turn !== WHITE) return;

    const targetMove = legalFromSelected.find(m => m.tr === r && m.tc === c);
    if (targetMove) {
      const piece = engine.board[selected[0]][selected[1]];
      const needsPromo = (piece?.type === PAWN && (piece?.color === WHITE && r === 0 || piece?.color === BLACK && r === 7));
      if (targetMove.flag === 'promotion' || needsPromo) {
        showPromo(targetMove);
        return;
      }
      doMove(targetMove);
      return;
    }

    const piece = engine.board[r][c];
    if (piece && piece.color === WHITE) {
      selected = [r, c];
      legalFromSelected = engine.getLegalMovesFrom(r, c);
    } else {
      selected = null;
      legalFromSelected = [];
    }
    render();
  }

  function showPromo(baseMove) {
    pendingPromotion = baseMove;
    promoEl.classList.remove('hidden');
    promoChoicesEl.innerHTML = '';
    for (const type of [QUEEN, ROOK, BISHOP, KNIGHT]) {
      const div = document.createElement('div');
      div.className = 'mini-promo-piece';
      div.textContent = PIECE_UNICODE[WHITE + type];
      div.onclick = () => {
        promoEl.classList.add('hidden');
        const m = legalFromSelected.find(x => x.tr === baseMove.tr && x.tc === baseMove.tc && x.promo === type);
        if (m) doMove(m);
      };
      promoChoicesEl.appendChild(div);
    }
  }

  function doMove(move) {
    engine.makeMove(move);
    lastMove = move;
    selected = null;
    legalFromSelected = [];
    render();

    if (!engine.gameOver) {
      statusEl.textContent = '...';
      setTimeout(() => {
        const aiMove = ai.getBestMove(2);
        if (aiMove) {
          engine.makeMove(aiMove);
          lastMove = aiMove;
        }
        render();
      }, 50);
    }
  }

  function renderStatus() {
    if (engine.gameOver) {
      statusEl.textContent = engine.result.length > 12 ? 'Game over' : engine.result;
    } else if (engine.turn === WHITE) {
      statusEl.textContent = engine.isInCheck(WHITE) ? 'Check!' : '';
    } else {
      statusEl.textContent = '...';
    }
  }

  newBtn.addEventListener('click', () => {
    engine.reset();
    selected = null;
    legalFromSelected = [];
    lastMove = null;
    render();
  });

  render();
})();
