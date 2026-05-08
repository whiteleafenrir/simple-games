import { BoardDirection, Cell, GameMode, Player, WinningLine } from './tic-tac-toe.model';

const DIRECTIONS: readonly BoardDirection[] = [
  { row: 0, col: 1 },
  { row: 1, col: 0 },
  { row: 1, col: 1 },
  { row: 1, col: -1 }
] as const;

export function createBoard(mode: GameMode): Cell[] {
  return Array<Cell>(mode.boardSize * mode.boardSize).fill(null);
}

export function createCells(mode: GameMode): number[] {
  return Array.from({ length: mode.boardSize * mode.boardSize }, (_: unknown, index: number): number => index);
}

export function createGridLines(mode: GameMode): number[] {
  return Array.from({ length: mode.boardSize - 1 }, (_: unknown, index: number): number => index + 1);
}

export function findWinningLine(index: number, board: Cell[], player: Player, mode: GameMode): WinningLine | null {
  for (const direction of DIRECTIONS) {
    const before: number[] = collectLine(index, -direction.row, -direction.col, board, player, mode);
    const after: number[] = collectLine(index, direction.row, direction.col, board, player, mode);
    const line: number[] = [...before.reverse(), index, ...after];

    if (line.length >= mode.winLength) {
      return {
        startIndex: line[0],
        endIndex: line[line.length - 1]
      };
    }
  }

  return null;
}

function collectLine(
  index: number,
  rowStep: number,
  colStep: number,
  board: Cell[],
  player: Player,
  mode: GameMode
): number[] {
  const result: number[] = [];
  let row: number = Math.floor(index / mode.boardSize) + rowStep;
  let col: number = (index % mode.boardSize) + colStep;

  while (isInsideBoard(row, col, mode)) {
    const nextIndex: number = row * mode.boardSize + col;

    if (board[nextIndex] !== player) {
      break;
    }

    result.push(nextIndex);
    row += rowStep;
    col += colStep;
  }

  return result;
}

function isInsideBoard(row: number, col: number, mode: GameMode): boolean {
  return row >= 0 && row < mode.boardSize && col >= 0 && col < mode.boardSize;
}
