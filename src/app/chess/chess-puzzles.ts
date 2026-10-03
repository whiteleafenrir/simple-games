import type { ChessPuzzleDto } from '@simple-games/pet-contract';
import { createChessGame, inspectChessGame, playChessMove } from './chess-engine';
import type { ChessColor, ChessGame, ChessMove, ChessPromotion, ChessSquare } from './chess-engine';

export interface ChessPuzzleRound {
  readonly puzzle: ChessPuzzleDto;
  readonly player: ChessColor;
  readonly game: ChessGame;
  readonly step: number;
  readonly outcome: 'playing' | 'solved' | 'revealed';
}

export type PuzzleMoveResult = {
  readonly round: ChessPuzzleRound;
  readonly feedback: 'solved' | 'correct' | 'try-again' | 'illegal-move' | 'finished';
};

export function uciMove(uci: string): ChessMove {
  if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) throw new Error('Invalid UCI move');
  return {
    from: uci.slice(0, 2) as ChessSquare,
    to: uci.slice(2, 4) as ChessSquare,
    ...(uci[4] ? { promotion: uci[4] as ChessPromotion } : {})
  };
}

export function createPuzzleRound(puzzle: ChessPuzzleDto): ChessPuzzleRound {
  const game = createChessGame(puzzle.fen);
  if (!puzzle.solution.length || puzzle.solution.length % 2 !== 1) throw new Error('Invalid puzzle solution');
  // Reject corrupt catalogue responses before starting a broken round.
  let replay = game;
  for (const uci of puzzle.solution) {
    const result = playChessMove(replay, uciMove(uci));
    if (!result.accepted) throw new Error(`Invalid solution for puzzle ${puzzle.id}`);
    replay = result.game;
  }
  return { puzzle, player: inspectChessGame(game).turn, game, step: 0, outcome: 'playing' };
}

export function nextPuzzleMove(round: ChessPuzzleRound): ChessMove | null {
  return round.outcome === 'playing' ? uciMove(round.puzzle.solution[round.step]) : null;
}

export function submitPuzzleMove(round: ChessPuzzleRound, move: ChessMove): PuzzleMoveResult {
  if (round.outcome !== 'playing') return { round, feedback: 'finished' };
  const result = playChessMove(round.game, move);
  if (!result.accepted) return { round, feedback: 'illegal-move' };
  const mates = inspectChessGame(result.game).outcome === 'checkmate';
  const expected = round.puzzle.solution[round.step];
  if (!mates && `${move.from}${move.to}${move.promotion ?? ''}` !== expected) return { round, feedback: 'try-again' };
  let step = round.step + 1;
  if (mates || step === round.puzzle.solution.length) {
    return { round: { ...round, game: result.game, step, outcome: 'solved' }, feedback: 'solved' };
  }
  const reply = playChessMove(result.game, uciMove(round.puzzle.solution[step]));
  if (!reply.accepted) throw new Error(`Invalid reply for puzzle ${round.puzzle.id}`);
  step++;
  return { round: { ...round, game: reply.game, step }, feedback: 'correct' };
}

export function revealPuzzle(round: ChessPuzzleRound): ChessPuzzleRound {
  if (round.outcome !== 'playing') return round;
  let revealed = round;
  while (revealed.outcome === 'playing') {
    revealed = submitPuzzleMove(revealed, nextPuzzleMove(revealed)!).round;
  }
  return { ...revealed, outcome: 'revealed' };
}
