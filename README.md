# Chess

A browser-based chess game with an AI opponent.

## How to Play

Open `index.html` in any modern browser:

```bash
open index.html
```

- **You play as White**, the AI plays as Black.
- Click a piece to see its legal moves (dots for empty squares, rings for captures).
- Click a highlighted square to move.
- When a pawn reaches the last rank, pick a promotion piece from the popup.

## Controls

- **New Game** — reset the board
- **Undo** — take back your last move (and the AI's response)
- **AI Strength** — Easy (depth 2), Medium (depth 3), Hard (depth 4)

## AI

The computer opponent uses minimax search with alpha-beta pruning, quiescence search, move ordering (MVV-LVA), and piece-square tables for positional evaluation.

## Features

- Full chess rules: castling, en passant, pawn promotion
- Checkmate, stalemate, fifty-move rule, insufficient material detection
- Move history in algebraic notation
- Captured pieces display
- Last-move and check highlighting
