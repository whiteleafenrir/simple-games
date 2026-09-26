import { DEFAULT_GAME_MODE } from './tic-tac-toe.config';
import type { Cell, Player } from './tic-tac-toe.model';
import { findWinningLine } from './tic-tac-toe.rules';

/** A beatable classic-board opponent: win, block, center, corner, then any cell. */
export function choosePetMove(board: Cell[], random = Math.random): number | null {
  if (board.length !== 9 || board.some((cell, index) => cell && findWinningLine(index, board, cell, DEFAULT_GAME_MODE))) return null;
  const available = board.flatMap((cell, index) => cell === null ? [index] : []);
  const pick = (choices: number[]): number => choices[Math.floor(random() * choices.length)];
  for (const player of ['O', 'X'] as const satisfies readonly Player[]) {
    const winning = available.filter(index => {
      const next = [...board];
      next[index] = player;
      return !!findWinningLine(index, next, player, DEFAULT_GAME_MODE);
    });
    if (winning.length) return pick(winning);
  }
  if (board[4] === null) return 4;
  const corners = available.filter(index => [0, 2, 6, 8].includes(index));
  return corners.length ? pick(corners) : available.length ? pick(available) : null;
}
