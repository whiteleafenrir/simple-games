import { Chess, DEFAULT_POSITION, SQUARES } from 'chess.js';
import type { Color, PieceSymbol, Square } from 'chess.js';

export type ChessColor = Color;
export type ChessPieceType = PieceSymbol;
export type ChessSquare = Square;
export type ChessPromotion = 'q' | 'r' | 'b' | 'n';

export interface ChessMove {
  readonly from: ChessSquare;
  readonly to: ChessSquare;
  readonly promotion?: ChessPromotion;
}

/** Replayable value state: FEN alone would lose repetition history. */
export interface ChessGame {
  readonly initialFen: string;
  readonly moves: readonly ChessMove[];
}

export interface ChessCell {
  readonly square: ChessSquare;
  readonly piece: { readonly color: ChessColor; readonly type: ChessPieceType } | null;
}

export type ChessOutcome =
  'playing' | 'checkmate' | 'stalemate' | 'repetition' | 'insufficient-material' | 'fifty-moves';

export interface ChessView {
  readonly fen: string;
  readonly turn: ChessColor;
  readonly board: readonly ChessCell[];
  readonly legalMoves: readonly ChessMove[];
  readonly inCheck: boolean;
  readonly outcome: ChessOutcome;
  readonly notation: readonly string[];
}

export type ChessMoveResult =
  | { readonly accepted: true; readonly game: ChessGame }
  | { readonly accepted: false; readonly reason: 'illegal-move' | 'finished'; readonly game: ChessGame };

/** Invalid FEN is a caller/content error and is rejected by chess.js. */
export function createChessGame(fen = DEFAULT_POSITION): ChessGame {
  return { initialFen: new Chess(fen).fen(), moves: [] };
}

function restoreGame(game: ChessGame): Chess {
  const chess = new Chess(game.initialFen);
  for (const move of game.moves) chess.move(move);
  return chess;
}

function outcome(chess: Chess): ChessOutcome {
  if (chess.isCheckmate()) return 'checkmate';
  if (chess.isStalemate()) return 'stalemate';
  if (chess.isThreefoldRepetition()) return 'repetition';
  if (chess.isInsufficientMaterial()) return 'insufficient-material';
  if (chess.isDrawByFiftyMoves()) return 'fifty-moves';
  return 'playing';
}

function moveValue(move: { from: Square; to: Square; promotion?: PieceSymbol }): ChessMove {
  return move.promotion
    ? { from: move.from, to: move.to, promotion: move.promotion as ChessPromotion }
    : { from: move.from, to: move.to };
}

export function inspectChessGame(game: ChessGame): ChessView {
  const chess = restoreGame(game);
  const result = outcome(chess);
  return {
    fen: chess.fen(),
    turn: chess.turn(),
    board: SQUARES.map((square) => ({ square, piece: chess.get(square) ?? null })),
    legalMoves: result === 'playing' ? chess.moves({ verbose: true }).map(moveValue) : [],
    inCheck: chess.isCheck(),
    outcome: result,
    notation: chess.history()
  };
}

/** Does not mutate the input; promotion must be chosen explicitly. */
export function playChessMove(game: ChessGame, move: ChessMove): ChessMoveResult {
  const chess = restoreGame(game);
  if (outcome(chess) !== 'playing') return { accepted: false, reason: 'finished', game };
  const legal = chess
    .moves({ verbose: true })
    .find(
      (candidate) => candidate.from === move.from && candidate.to === move.to && candidate.promotion === move.promotion
    );
  if (!legal) return { accepted: false, reason: 'illegal-move', game };
  return { accepted: true, game: { initialFen: game.initialFen, moves: [...game.moves, moveValue(legal)] } };
}

export function undoChessMove(game: ChessGame): ChessGame {
  return game.moves.length ? { initialFen: game.initialFen, moves: game.moves.slice(0, -1) } : game;
}
