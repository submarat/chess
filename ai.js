const PIECE_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

const PST = {
  p: [
    [0,  0,  0,  0,  0,  0,  0,  0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [5,  5, 10, 25, 25, 10,  5,  5],
    [0,  0,  0, 20, 20,  0,  0,  0],
    [5, -5,-10,  0,  0,-10, -5,  5],
    [5, 10, 10,-20,-20, 10, 10,  5],
    [0,  0,  0,  0,  0,  0,  0,  0],
  ],
  n: [
    [-50,-40,-30,-30,-30,-30,-40,-50],
    [-40,-20,  0,  0,  0,  0,-20,-40],
    [-30,  0, 10, 15, 15, 10,  0,-30],
    [-30,  5, 15, 20, 20, 15,  5,-30],
    [-30,  0, 15, 20, 20, 15,  0,-30],
    [-30,  5, 10, 15, 15, 10,  5,-30],
    [-40,-20,  0,  5,  5,  0,-20,-40],
    [-50,-40,-30,-30,-30,-30,-40,-50],
  ],
  b: [
    [-20,-10,-10,-10,-10,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0, 10, 10, 10, 10,  0,-10],
    [-10,  5,  5, 10, 10,  5,  5,-10],
    [-10,  0,  5, 10, 10,  5,  0,-10],
    [-10, 10,  5, 10, 10,  5, 10,-10],
    [-10,  5,  0,  0,  0,  0,  5,-10],
    [-20,-10,-10,-10,-10,-10,-10,-20],
  ],
  r: [
    [0,  0,  0,  0,  0,  0,  0,  0],
    [5, 10, 10, 10, 10, 10, 10,  5],
    [-5, 0,  0,  0,  0,  0,  0, -5],
    [-5, 0,  0,  0,  0,  0,  0, -5],
    [-5, 0,  0,  0,  0,  0,  0, -5],
    [-5, 0,  0,  0,  0,  0,  0, -5],
    [-5, 0,  0,  0,  0,  0,  0, -5],
    [0,  0,  0,  5,  5,  0,  0,  0],
  ],
  q: [
    [-20,-10,-10, -5, -5,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5,  5,  5,  5,  0,-10],
    [ -5,  0,  5,  5,  5,  5,  0, -5],
    [  0,  0,  5,  5,  5,  5,  0, -5],
    [-10,  5,  5,  5,  5,  5,  0,-10],
    [-10,  0,  5,  0,  0,  0,  0,-10],
    [-20,-10,-10, -5, -5,-10,-10,-20],
  ],
  k: [
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-20,-30,-30,-40,-40,-30,-30,-20],
    [-10,-20,-20,-20,-20,-20,-20,-10],
    [ 20, 20,  0,  0,  0,  0, 20, 20],
    [ 20, 30, 10,  0,  0, 10, 30, 20],
  ],
};

class ChessAI {
  constructor(engine) {
    this.engine = engine;
    this.nodesSearched = 0;
  }

  evaluate() {
    let score = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.engine.board[r][c];
        if (!p) continue;
        const val = PIECE_VALUES[p.type];
        const pstRow = p.color === WHITE ? r : 7 - r;
        const pst = PST[p.type][pstRow][c];
        score += p.color === WHITE ? (val + pst) : -(val + pst);
      }
    }
    return score;
  }

  orderMoves(moves) {
    return moves.sort((a, b) => {
      let sa = 0, sb = 0;
      if (a.captured) sa += PIECE_VALUES[a.captured.type] - PIECE_VALUES[this.engine.board[a.fr]?.[a.fc]?.type || 'p'] / 10;
      if (b.captured) sb += PIECE_VALUES[b.captured.type] - PIECE_VALUES[this.engine.board[b.fr]?.[b.fc]?.type || 'p'] / 10;
      if (a.flag === 'promotion') sa += 800;
      if (b.flag === 'promotion') sb += 800;
      return sb - sa;
    });
  }

  minimax(depth, alpha, beta, maximizing) {
    this.nodesSearched++;

    if (depth === 0) return this.quiesce(alpha, beta, maximizing, 4);

    const color = maximizing ? WHITE : BLACK;
    const moves = this.engine.generateLegalMoves(color);

    if (moves.length === 0) {
      if (this.engine.isInCheck(color)) {
        return maximizing ? -99999 + (100 - depth) : 99999 - (100 - depth);
      }
      return 0;
    }

    this.orderMoves(moves);

    if (maximizing) {
      let best = -Infinity;
      for (const move of moves) {
        this.engine.applyMoveRaw(move);
        const oldTurn = this.engine.turn;
        this.engine.turn = BLACK;
        const score = this.minimax(depth - 1, alpha, beta, false);
        this.engine.turn = oldTurn;
        this.engine.undoMoveRaw(move);
        best = Math.max(best, score);
        alpha = Math.max(alpha, score);
        if (beta <= alpha) break;
      }
      return best;
    } else {
      let best = Infinity;
      for (const move of moves) {
        this.engine.applyMoveRaw(move);
        const oldTurn = this.engine.turn;
        this.engine.turn = WHITE;
        const score = this.minimax(depth - 1, alpha, beta, true);
        this.engine.turn = oldTurn;
        this.engine.undoMoveRaw(move);
        best = Math.min(best, score);
        beta = Math.min(beta, score);
        if (beta <= alpha) break;
      }
      return best;
    }
  }

  quiesce(alpha, beta, maximizing, depth) {
    const standPat = this.evaluate();

    if (depth === 0) return standPat;

    if (maximizing) {
      if (standPat >= beta) return beta;
      if (standPat > alpha) alpha = standPat;
    } else {
      if (standPat <= alpha) return alpha;
      if (standPat < beta) beta = standPat;
    }

    const color = maximizing ? WHITE : BLACK;
    const moves = this.engine.generateLegalMoves(color).filter(m => m.captured || m.flag === 'promotion');
    this.orderMoves(moves);

    if (maximizing) {
      for (const move of moves) {
        this.engine.applyMoveRaw(move);
        const oldTurn = this.engine.turn;
        this.engine.turn = BLACK;
        const score = this.quiesce(alpha, beta, false, depth - 1);
        this.engine.turn = oldTurn;
        this.engine.undoMoveRaw(move);
        if (score >= beta) return beta;
        if (score > alpha) alpha = score;
      }
      return alpha;
    } else {
      for (const move of moves) {
        this.engine.applyMoveRaw(move);
        const oldTurn = this.engine.turn;
        this.engine.turn = WHITE;
        const score = this.quiesce(alpha, beta, true, depth - 1);
        this.engine.turn = oldTurn;
        this.engine.undoMoveRaw(move);
        if (score <= alpha) return alpha;
        if (score < beta) beta = score;
      }
      return beta;
    }
  }

  getBestMove(depth) {
    this.nodesSearched = 0;
    const moves = this.engine.generateLegalMoves(BLACK);
    if (moves.length === 0) return null;

    this.orderMoves(moves);

    let bestScore = Infinity;
    let bestMove = moves[0];

    for (const move of moves) {
      this.engine.applyMoveRaw(move);
      const oldTurn = this.engine.turn;
      this.engine.turn = WHITE;
      const score = this.minimax(depth - 1, -Infinity, Infinity, true);
      this.engine.turn = oldTurn;
      this.engine.undoMoveRaw(move);

      if (score < bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove;
  }
}
