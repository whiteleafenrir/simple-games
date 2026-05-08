import { BoardMetrics, BoardPoint } from './board-view.model';
import { GameMode } from './tic-tac-toe.model';

export function cellSize(viewBoxSize: number, mode: GameMode): number {
  return viewBoxSize / mode.boardSize;
}

export function cellX(index: number, mode: GameMode, size: number): number {
  return (index % mode.boardSize) * size;
}

export function cellY(index: number, mode: GameMode, size: number): number {
  return Math.floor(index / mode.boardSize) * size;
}

export function cellCenter(index: number, mode: GameMode, size: number): BoardPoint {
  return {
    x: cellX(index, mode, size) + size / 2,
    y: cellY(index, mode, size) + size / 2
  };
}

export function boardMetrics(size: number): BoardMetrics {
  return {
    markPadding: size * 0.28,
    circleRadius: size * 0.26,
    markStroke: Math.max(4, size * 0.1),
    gridStroke: Math.max(1.5, Math.min(8, size * 0.035)),
    winStroke: Math.max(5, size * 0.12)
  };
}
