(() => {
  const engine = new ChessEngine();
  const ai = new ChessAI(engine);

  const boardEl = document.getElementById('board');
  const statusEl = document.getElementById('status');
  const movesListEl = document.getElementById('moves-list');
  const capturesWhiteEl = document.getElementById('captures-white');
  const capturesBlackEl = document.getElementById('captures-black');
  const promotionModal = document.getElementById('promotion-modal');
  const promotionChoices = document.getElementById('promotion-choices');
  const rankLabels = document.getElementById('rank-labels');
  const fileLabels = document.getElementById('file-labels');
  const depthSelect = document.getElementById('depth-select');
  const newGameBtn = document.getElementById('new-game-btn');
  const undoBtn = document.getElementById('undo-btn');

  let selected = null;
  let legalFromSelected = [];
  let lastMove = null;
  let pendingPromotion = null;

  function init() {
    renderLabels();
    render();

    newGameBtn.addEventListener('click', () => {
      engine.reset();
      selected = null;
      legalFromSelected = [];
      lastMove = null;
      render();
    });

    undoBtn.addEventListener('click', () => {
      if (engine.gameOver) return;
      engine.unmakeMove();
      engine.unmakeMove();
      lastMove = null;
      selected = null;
      legalFromSelected = [];
      render();
    });
  }

  function renderLabels() {
    rankLabels.innerHTML = '';
    fileLabels.innerHTML = '';
    for (let i = 8; i >= 1; i--) {
      const d = document.createElement('div');
      d.textContent = i;
      rankLabels.appendChild(d);
    }
    for (const f of 'abcdefgh') {
      const d = document.createElement('div');
      d.textContent = f;
      fileLabels.appendChild(d);
    }
  }

  function render() {
    renderBoard();
    renderStatus();
    renderMoves();
    renderCaptures();
  }

  function renderBoard() {
    boardEl.innerHTML = '';
    const inCheck = engine.isInCheck(engine.turn);
    const [kr, kc] = engine.findKing(engine.turn);

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const sq = document.createElement('div');
        sq.className = 'square ' + ((r + c) % 2 === 0 ? 'light' : 'dark');
        sq.dataset.r = r;
        sq.dataset.c = c;

        if (selected && selected[0] === r && selected[1] === c) {
          sq.classList.add('selected');
        }

        if (lastMove) {
          if (lastMove.fr === r && lastMove.fc === c) sq.classList.add('last-move-from');
          if (lastMove.tr === r && lastMove.tc === c) sq.classList.add('last-move-to');
        }

        if (inCheck && r === kr && c === kc) {
          sq.classList.add('in-check');
        }

        const isLegalTarget = legalFromSelected.some(m => m.tr === r && m.tc === c);
        if (isLegalTarget) {
          const piece = engine.board[r][c];
          sq.classList.add(piece ? 'legal-capture' : 'legal-move');
        }

        const p = engine.board[r][c];
        if (p) {
          const span = document.createElement('span');
          span.className = 'piece';
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
      if (targetMove.flag === 'promotion' || (engine.board[selected[0]][selected[1]]?.type === PAWN &&
          ((engine.board[selected[0]][selected[1]]?.color === WHITE && r === 0) ||
           (engine.board[selected[0]][selected[1]]?.color === BLACK && r === 7)))) {
        showPromotionUI(targetMove);
        return;
      }
      executePlayerMove(targetMove);
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

  function showPromotionUI(baseMove) {
    pendingPromotion = baseMove;
    promotionModal.classList.remove('hidden');
    promotionChoices.innerHTML = '';

    for (const type of [QUEEN, ROOK, BISHOP, KNIGHT]) {
      const div = document.createElement('div');
      div.className = 'promo-piece';
      div.textContent = PIECE_UNICODE[WHITE + type];
      div.addEventListener('click', () => {
        promotionModal.classList.add('hidden');
        const promoMove = legalFromSelected.find(
          m => m.tr === baseMove.tr && m.tc === baseMove.tc && m.promo === type
        );
        if (promoMove) executePlayerMove(promoMove);
      });
      promotionChoices.appendChild(div);
    }
  }

  function executePlayerMove(move) {
    engine.makeMove(move);
    lastMove = move;
    selected = null;
    legalFromSelected = [];
    render();

    if (!engine.gameOver) {
      statusEl.textContent = 'Thinking...';
      statusEl.className = 'thinking';

      setTimeout(() => {
        const depth = parseInt(depthSelect.value);
        const aiMove = ai.getBestMove(depth);
        if (aiMove) {
          engine.makeMove(aiMove);
          lastMove = aiMove;
        }
        render();
      }, 50);
    }
  }

  function renderStatus() {
    statusEl.className = '';
    if (engine.gameOver) {
      statusEl.textContent = engine.result;
      statusEl.className = engine.result.includes('Draw') ? 'draw' : 'checkmate';
    } else if (engine.turn === WHITE) {
      statusEl.textContent = engine.isInCheck(WHITE) ? 'Check! Your turn' : 'Your turn (White)';
    } else {
      statusEl.textContent = 'Thinking...';
      statusEl.className = 'thinking';
    }
  }

  function renderMoves() {
    movesListEl.innerHTML = '';
    for (let i = 0; i < engine.moveList.length; i += 2) {
      const num = document.createElement('span');
      num.className = 'move-number';
      num.textContent = (i / 2 + 1) + '.';
      movesListEl.appendChild(num);

      const w = document.createElement('span');
      w.className = 'move-entry';
      w.textContent = engine.moveList[i];
      movesListEl.appendChild(w);

      if (i + 1 < engine.moveList.length) {
        const b = document.createElement('span');
        b.className = 'move-entry';
        b.textContent = engine.moveList[i + 1];
        movesListEl.appendChild(b);
      } else {
        movesListEl.appendChild(document.createElement('span'));
      }
    }
    movesListEl.scrollTop = movesListEl.scrollHeight;
  }

  function renderCaptures() {
    const pieceOrder = { q: 0, r: 1, b: 2, n: 3, p: 4 };
    const renderList = (el, pieces) => {
      el.innerHTML = '';
      const sorted = [...pieces].sort((a, b) => pieceOrder[a.type] - pieceOrder[b.type]);
      for (const p of sorted) {
        const span = document.createElement('span');
        span.textContent = PIECE_UNICODE[p.color + p.type];
        el.appendChild(span);
      }
    };
    renderList(capturesBlackEl, engine.capturedPieces.b);
    renderList(capturesWhiteEl, engine.capturedPieces.w);
  }

  init();
})();
