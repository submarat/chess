const WHITE = 'w';
const BLACK = 'b';

const PAWN = 'p';
const KNIGHT = 'n';
const BISHOP = 'b';
const ROOK = 'r';
const QUEEN = 'q';
const KING = 'k';

const PIECE_UNICODE = {
  wp: '♙', wn: '♘', wb: '♗', wr: '♖', wq: '♕', wk: '♔',
  bp: '♟', bn: '♞', bb: '♝', br: '♜', bq: '♛', bk: '♚',
};

const FILES = 'abcdefgh';

function coordToAlg(r, c) {
  return FILES[c] + (8 - r);
}

function algToCoord(alg) {
  return [8 - parseInt(alg[1]), FILES.indexOf(alg[0])];
}

class ChessEngine {
  constructor() {
    this.reset();
  }

  reset() {
    this.board = this.initialBoard();
    this.turn = WHITE;
    this.castling = { wk: true, wq: true, bk: true, bq: true };
    this.enPassant = null;
    this.halfmove = 0;
    this.fullmove = 1;
    this.history = [];
    this.capturedPieces = { w: [], b: [] };
    this.moveList = [];
    this.gameOver = false;
    this.result = null;
  }

  initialBoard() {
    const board = Array.from({ length: 8 }, () => Array(8).fill(null));
    const backRank = [ROOK, KNIGHT, BISHOP, QUEEN, KING, BISHOP, KNIGHT, ROOK];

    for (let c = 0; c < 8; c++) {
      board[0][c] = { color: BLACK, type: backRank[c] };
      board[1][c] = { color: BLACK, type: PAWN };
      board[6][c] = { color: WHITE, type: PAWN };
      board[7][c] = { color: WHITE, type: backRank[c] };
    }
    return board;
  }

  at(r, c) {
    if (r < 0 || r > 7 || c < 0 || c > 7) return undefined;
    return this.board[r][c];
  }

  clone() {
    const e = new ChessEngine();
    e.board = this.board.map(row => row.map(sq => sq ? { ...sq } : null));
    e.turn = this.turn;
    e.castling = { ...this.castling };
    e.enPassant = this.enPassant;
    e.halfmove = this.halfmove;
    e.fullmove = this.fullmove;
    e.gameOver = this.gameOver;
    e.result = this.result;
    e.capturedPieces = {
      w: [...this.capturedPieces.w],
      b: [...this.capturedPieces.b],
    };
    e.moveList = [...this.moveList];
    e.history = [];
    return e;
  }

  generatePseudoMoves(color) {
    const moves = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.board[r][c];
        if (!p || p.color !== color) continue;
        switch (p.type) {
          case PAWN: this.pawnMoves(r, c, color, moves); break;
          case KNIGHT: this.knightMoves(r, c, color, moves); break;
          case BISHOP: this.slidingMoves(r, c, color, moves, [[-1,-1],[-1,1],[1,-1],[1,1]]); break;
          case ROOK: this.slidingMoves(r, c, color, moves, [[-1,0],[1,0],[0,-1],[0,1]]); break;
          case QUEEN: this.slidingMoves(r, c, color, moves, [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]]); break;
          case KING: this.kingMoves(r, c, color, moves); break;
        }
      }
    }
    return moves;
  }

  pawnMoves(r, c, color, moves) {
    const dir = color === WHITE ? -1 : 1;
    const startRow = color === WHITE ? 6 : 1;
    const promoRow = color === WHITE ? 0 : 7;

    const addPawnMove = (fr, fc, tr, tc, captured, flag) => {
      if (tr === promoRow) {
        for (const promo of [QUEEN, ROOK, BISHOP, KNIGHT]) {
          moves.push({ fr, fc, tr, tc, captured, flag: 'promotion', promo });
        }
      } else {
        moves.push({ fr, fc, tr, tc, captured, flag: flag || null });
      }
    };

    if (!this.board[r + dir]?.[c]) {
      addPawnMove(r, c, r + dir, c, null);
      if (r === startRow && !this.board[r + 2 * dir][c]) {
        addPawnMove(r, c, r + 2 * dir, c, null, 'double');
      }
    }

    for (const dc of [-1, 1]) {
      const nc = c + dc;
      if (nc < 0 || nc > 7) continue;
      const target = this.board[r + dir]?.[nc];
      if (target && target.color !== color) {
        addPawnMove(r, c, r + dir, nc, target);
      }
      if (this.enPassant && this.enPassant[0] === r + dir && this.enPassant[1] === nc) {
        moves.push({
          fr: r, fc: c, tr: r + dir, tc: nc,
          captured: this.board[r][nc],
          flag: 'enpassant',
        });
      }
    }
  }

  knightMoves(r, c, color, moves) {
    const offsets = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
    for (const [dr, dc] of offsets) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr > 7 || nc < 0 || nc > 7) continue;
      const target = this.board[nr][nc];
      if (target && target.color === color) continue;
      moves.push({ fr: r, fc: c, tr: nr, tc: nc, captured: target, flag: null });
    }
  }

  slidingMoves(r, c, color, moves, dirs) {
    for (const [dr, dc] of dirs) {
      let nr = r + dr, nc = c + dc;
      while (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7) {
        const target = this.board[nr][nc];
        if (target) {
          if (target.color !== color) {
            moves.push({ fr: r, fc: c, tr: nr, tc: nc, captured: target, flag: null });
          }
          break;
        }
        moves.push({ fr: r, fc: c, tr: nr, tc: nc, captured: null, flag: null });
        nr += dr;
        nc += dc;
      }
    }
  }

  kingMoves(r, c, color, moves) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nr > 7 || nc < 0 || nc > 7) continue;
        const target = this.board[nr][nc];
        if (target && target.color === color) continue;
        moves.push({ fr: r, fc: c, tr: nr, tc: nc, captured: target, flag: null });
      }
    }

    const row = color === WHITE ? 7 : 0;
    if (r === row && c === 4) {
      if (this.castling[color + 'k'] &&
          !this.board[row][5] && !this.board[row][6] &&
          this.board[row][7]?.type === ROOK && this.board[row][7]?.color === color) {
        if (!this.isSquareAttacked(row, 4, color) &&
            !this.isSquareAttacked(row, 5, color) &&
            !this.isSquareAttacked(row, 6, color)) {
          moves.push({ fr: row, fc: 4, tr: row, tc: 6, captured: null, flag: 'castleK' });
        }
      }
      if (this.castling[color + 'q'] &&
          !this.board[row][3] && !this.board[row][2] && !this.board[row][1] &&
          this.board[row][0]?.type === ROOK && this.board[row][0]?.color === color) {
        if (!this.isSquareAttacked(row, 4, color) &&
            !this.isSquareAttacked(row, 3, color) &&
            !this.isSquareAttacked(row, 2, color)) {
          moves.push({ fr: row, fc: 4, tr: row, tc: 2, captured: null, flag: 'castleQ' });
        }
      }
    }
  }

  isSquareAttacked(r, c, byDefender) {
    const attacker = byDefender === WHITE ? BLACK : WHITE;
    const dir = attacker === WHITE ? -1 : 1;

    if (r - dir >= 0 && r - dir <= 7) {
      if (c - 1 >= 0 && this.board[r - dir][c - 1]?.color === attacker && this.board[r - dir][c - 1]?.type === PAWN) return true;
      if (c + 1 <= 7 && this.board[r - dir][c + 1]?.color === attacker && this.board[r - dir][c + 1]?.type === PAWN) return true;
    }

    const knightOffsets = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
    for (const [dr, dc] of knightOffsets) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7 &&
          this.board[nr][nc]?.color === attacker && this.board[nr][nc]?.type === KNIGHT) return true;
    }

    const bishopDirs = [[-1,-1],[-1,1],[1,-1],[1,1]];
    for (const [dr, dc] of bishopDirs) {
      let nr = r + dr, nc = c + dc;
      while (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7) {
        const p = this.board[nr][nc];
        if (p) {
          if (p.color === attacker && (p.type === BISHOP || p.type === QUEEN)) return true;
          break;
        }
        nr += dr; nc += dc;
      }
    }

    const rookDirs = [[-1,0],[1,0],[0,-1],[0,1]];
    for (const [dr, dc] of rookDirs) {
      let nr = r + dr, nc = c + dc;
      while (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7) {
        const p = this.board[nr][nc];
        if (p) {
          if (p.color === attacker && (p.type === ROOK || p.type === QUEEN)) return true;
          break;
        }
        nr += dr; nc += dc;
      }
    }

    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7 &&
            this.board[nr][nc]?.color === attacker && this.board[nr][nc]?.type === KING) return true;
      }
    }

    return false;
  }

  findKing(color) {
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++)
        if (this.board[r][c]?.color === color && this.board[r][c]?.type === KING)
          return [r, c];
    return null;
  }

  isInCheck(color) {
    const [kr, kc] = this.findKing(color);
    return this.isSquareAttacked(kr, kc, color);
  }

  generateLegalMoves(color) {
    color = color || this.turn;
    const pseudos = this.generatePseudoMoves(color);
    const legal = [];

    for (const move of pseudos) {
      this.applyMoveRaw(move);
      if (!this.isInCheck(color)) {
        legal.push(move);
      }
      this.undoMoveRaw(move);
    }
    return legal;
  }

  applyMoveRaw(move) {
    const piece = this.board[move.fr][move.fc];
    move._piece = { ...piece };
    move._castling = { ...this.castling };
    move._enPassant = this.enPassant;
    move._halfmove = this.halfmove;

    this.board[move.tr][move.tc] = piece;
    this.board[move.fr][move.fc] = null;

    if (move.flag === 'enpassant') {
      const capturedRow = piece.color === WHITE ? move.tr + 1 : move.tr - 1;
      move._epCaptured = this.board[capturedRow][move.tc];
      this.board[capturedRow][move.tc] = null;
    }

    if (move.flag === 'promotion') {
      this.board[move.tr][move.tc] = { color: piece.color, type: move.promo };
    }

    if (move.flag === 'castleK') {
      const row = move.fr;
      this.board[row][5] = this.board[row][7];
      this.board[row][7] = null;
    }
    if (move.flag === 'castleQ') {
      const row = move.fr;
      this.board[row][3] = this.board[row][0];
      this.board[row][0] = null;
    }

    if (move.flag === 'double') {
      this.enPassant = [(move.fr + move.tr) / 2, move.fc];
    } else {
      this.enPassant = null;
    }

    if (piece.type === KING) {
      this.castling[piece.color + 'k'] = false;
      this.castling[piece.color + 'q'] = false;
    }
    if (piece.type === ROOK) {
      if (move.fr === 7 && move.fc === 7) this.castling.wk = false;
      if (move.fr === 7 && move.fc === 0) this.castling.wq = false;
      if (move.fr === 0 && move.fc === 7) this.castling.bk = false;
      if (move.fr === 0 && move.fc === 0) this.castling.bq = false;
    }
    if (move.captured?.type === ROOK) {
      if (move.tr === 7 && move.tc === 7) this.castling.wk = false;
      if (move.tr === 7 && move.tc === 0) this.castling.wq = false;
      if (move.tr === 0 && move.tc === 7) this.castling.bk = false;
      if (move.tr === 0 && move.tc === 0) this.castling.bq = false;
    }
  }

  undoMoveRaw(move) {
    this.board[move.fr][move.fc] = move._piece;
    this.board[move.tr][move.tc] = move.captured && move.flag !== 'enpassant' ? move.captured : null;

    if (move.flag === 'enpassant') {
      const capturedRow = move._piece.color === WHITE ? move.tr + 1 : move.tr - 1;
      this.board[capturedRow][move.tc] = move._epCaptured;
    }

    if (move.flag === 'castleK') {
      const row = move.fr;
      this.board[row][7] = this.board[row][5];
      this.board[row][5] = null;
    }
    if (move.flag === 'castleQ') {
      const row = move.fr;
      this.board[row][0] = this.board[row][3];
      this.board[row][3] = null;
    }

    this.castling = move._castling;
    this.enPassant = move._enPassant;
    this.halfmove = move._halfmove;
  }

  makeMove(move) {
    const snapshot = {
      board: this.board.map(row => row.map(sq => sq ? { ...sq } : null)),
      turn: this.turn,
      castling: { ...this.castling },
      enPassant: this.enPassant,
      halfmove: this.halfmove,
      fullmove: this.fullmove,
      capturedPieces: { w: [...this.capturedPieces.w], b: [...this.capturedPieces.b] },
      moveList: [...this.moveList],
    };
    this.history.push(snapshot);

    const piece = this.board[move.fr][move.fc];
    const isCapture = !!move.captured;
    const isPawnMove = piece.type === PAWN;

    this.applyMoveRaw(move);

    if (move.captured) {
      this.capturedPieces[move.captured.color].push(move.captured);
    }
    if (move.flag === 'enpassant') {
      this.capturedPieces[piece.color === WHITE ? BLACK : WHITE] = this.capturedPieces[piece.color === WHITE ? BLACK : WHITE] || [];
    }

    this.halfmove = (isPawnMove || isCapture) ? 0 : this.halfmove + 1;

    const notation = this.toAlgebraic(move, piece);
    this.moveList.push(notation);

    this.turn = this.turn === WHITE ? BLACK : WHITE;
    if (this.turn === WHITE) this.fullmove++;

    this.checkGameEnd();
  }

  toAlgebraic(move, piece) {
    if (move.flag === 'castleK') return 'O-O';
    if (move.flag === 'castleQ') return 'O-O-O';

    let s = '';
    if (piece.type !== PAWN) {
      s += piece.type.toUpperCase();
    }
    if (move.captured || move.flag === 'enpassant') {
      if (piece.type === PAWN) s += FILES[move.fc];
      s += 'x';
    }
    s += coordToAlg(move.tr, move.tc);
    if (move.flag === 'promotion') s += '=' + move.promo.toUpperCase();

    const opp = piece.color === WHITE ? BLACK : WHITE;
    if (this.isInCheck(opp)) {
      const legalMoves = this.generateLegalMoves(opp);
      s += legalMoves.length === 0 ? '#' : '+';
    }

    return s;
  }

  unmakeMove() {
    if (this.history.length === 0) return false;
    const snap = this.history.pop();
    this.board = snap.board;
    this.turn = snap.turn;
    this.castling = snap.castling;
    this.enPassant = snap.enPassant;
    this.halfmove = snap.halfmove;
    this.fullmove = snap.fullmove;
    this.capturedPieces = snap.capturedPieces;
    this.moveList = snap.moveList;
    this.gameOver = false;
    this.result = null;
    return true;
  }

  checkGameEnd() {
    const legal = this.generateLegalMoves(this.turn);
    if (legal.length === 0) {
      this.gameOver = true;
      if (this.isInCheck(this.turn)) {
        this.result = this.turn === WHITE ? 'Black wins by checkmate' : 'White wins by checkmate';
      } else {
        this.result = 'Draw by stalemate';
      }
    } else if (this.halfmove >= 100) {
      this.gameOver = true;
      this.result = 'Draw by fifty-move rule';
    } else if (this.isInsufficientMaterial()) {
      this.gameOver = true;
      this.result = 'Draw by insufficient material';
    }
  }

  isInsufficientMaterial() {
    const pieces = [];
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++)
        if (this.board[r][c]) pieces.push(this.board[r][c]);

    if (pieces.length === 2) return true;
    if (pieces.length === 3) {
      return pieces.some(p => p.type === BISHOP || p.type === KNIGHT);
    }
    return false;
  }

  getLegalMovesFrom(r, c) {
    return this.generateLegalMoves(this.turn).filter(m => m.fr === r && m.fc === c);
  }
}
