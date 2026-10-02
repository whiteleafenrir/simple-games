import { createChessGame, inspectChessGame, playChessMove } from './chess-engine';
import type { ChessColor, ChessGame, ChessMove } from './chess-engine';

export interface ChessPuzzle {
  readonly id: string;
  readonly goal: 'mate-in-one';
  readonly fen: string;
}

// Original, locally composed teaching positions; no third-party puzzle database.
export const CHESS_PUZZLES: readonly ChessPuzzle[] = [
  { id: 'queen-net', goal: 'mate-in-one', fen: '7k/8/5KQ1/8/8/8/8/8 w - - 0 1' },
  { id: 'back-rank', goal: 'mate-in-one', fen: '6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1' },
  { id: 'bishop-net', goal: 'mate-in-one', fen: '7k/5K1p/7B/8/8/8/8/8 w - - 0 1' },
  { id: 'smothered', goal: 'mate-in-one', fen: '6rk/6pp/8/4N3/8/8/8/K7 w - - 0 1' },
  { id: 'promotion', goal: 'mate-in-one', fen: '7k/5P2/6K1/8/8/8/8/8 w - - 0 1' },
  { id: 'underpromotion', goal: 'mate-in-one', fen: '6br/5Ppk/7p/8/8/8/8/K7 w - - 0 1' },
  { id: 'black-queen', goal: 'mate-in-one', fen: '8/8/8/8/8/5kq1/8/7K b - - 0 1' },
  { id: 'black-rook', goal: 'mate-in-one', fen: '4r1k1/8/8/8/8/8/5PPP/6K1 b - - 0 1' }
];

export interface ChessPuzzleRound {
  readonly puzzle: ChessPuzzle;
  readonly player: ChessColor;
  readonly game: ChessGame;
  readonly outcome: 'playing' | 'solved' | 'revealed';
}

export type PuzzleMoveResult = {
  readonly round: ChessPuzzleRound;
  readonly feedback: 'solved' | 'try-again' | 'illegal-move' | 'finished';
};

export function chooseChessPuzzle(previousId?: string, random = Math.random): ChessPuzzle {
  const choices = CHESS_PUZZLES.filter((puzzle) => puzzle.id !== previousId);
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1) throw new Error('Random must return a value in [0, 1).');
  return choices[Math.floor(value * choices.length)];
}

export function createPuzzleRound(puzzle: ChessPuzzle): ChessPuzzleRound {
  const game = createChessGame(puzzle.fen);
  return { puzzle, player: inspectChessGame(game).turn, game, outcome: 'playing' };
}

export function findMatingMoves(game: ChessGame): readonly ChessMove[] {
  return inspectChessGame(game).legalMoves.filter((move) => {
    const result = playChessMove(game, move);
    return result.accepted && inspectChessGame(result.game).outcome === 'checkmate';
  });
}

export function submitPuzzleMove(round: ChessPuzzleRound, move: ChessMove): PuzzleMoveResult {
  if (round.outcome !== 'playing') return { round, feedback: 'finished' };
  const result = playChessMove(round.game, move);
  if (!result.accepted) return { round, feedback: 'illegal-move' };
  if (inspectChessGame(result.game).outcome !== 'checkmate') return { round, feedback: 'try-again' };
  return { round: { ...round, game: result.game, outcome: 'solved' }, feedback: 'solved' };
}

export function revealPuzzle(round: ChessPuzzleRound): ChessPuzzleRound {
  if (round.outcome !== 'playing') return round;
  const move = findMatingMoves(round.game)[0];
  if (!move) throw new Error(`Puzzle has no mate in one: ${round.puzzle.id}`);
  const result = submitPuzzleMove(round, move);
  return { ...result.round, outcome: 'revealed' };
}
