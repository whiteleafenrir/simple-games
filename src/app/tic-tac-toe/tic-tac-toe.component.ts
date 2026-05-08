import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { I18nService } from '../i18n/i18n.service';
import { BoardMetrics, BoardPoint } from './board-view.model';
import { boardMetrics, cellCenter, cellSize, cellX, cellY } from './board-view.utils';
import { BOARD_VIEW_BOX_SIZE, DEFAULT_GAME_MODE, GAME_MODES } from './tic-tac-toe.config';
import { Cell, GameMode, Player, Score, WinningLine } from './tic-tac-toe.model';
import { createBoard, createCells, createGridLines, findWinningLine } from './tic-tac-toe.rules';

@Component({
  selector: 'app-tic-tac-toe',
  imports: [
    RouterLink
  ],
  templateUrl: './tic-tac-toe.component.html',
  styleUrls: ['./tic-tac-toe.component.css']
})
export class TicTacToeComponent {
  readonly modes: readonly GameMode[] = GAME_MODES;
  readonly viewBoxSize: number = BOARD_VIEW_BOX_SIZE;

  readonly selectedMode = signal<GameMode>(DEFAULT_GAME_MODE);
  readonly board = signal<Cell[]>(createBoard(DEFAULT_GAME_MODE));
  readonly currentPlayer = signal<Player>('X');
  readonly winner = signal<Player | null>(null);
  readonly winningLine = signal<WinningLine | null>(null);
  readonly isDraw = signal<boolean>(false);
  readonly score = signal<Score>({
    X: 0,
    O: 0
  });

  readonly cells = computed((): number[] => createCells(this.selectedMode()));
  readonly gridLines = computed((): number[] => createGridLines(this.selectedMode()));
  readonly canContinue = computed((): boolean => !this.winner() && !this.isDraw());
  readonly cellSize = computed((): number => cellSize(this.viewBoxSize, this.selectedMode()));
  readonly metrics = computed((): BoardMetrics => boardMetrics(this.cellSize()));
  readonly statusText = computed((): string => {
    const winner: Player | null = this.winner();

    if (winner) {
      return `${this.i18n.t('winner')} ${winner}`;
    }

    if (this.isDraw()) {
      return this.i18n.t('draw');
    }

    return `${this.i18n.t('turn')} ${this.currentPlayer()}`;
  });
  readonly winningLinePoints = computed((): string | null => {
    const line: WinningLine | null = this.winningLine();

    if (!line) {
      return null;
    }

    const start: BoardPoint = this.cellCenter(line.startIndex);
    const end: BoardPoint = this.cellCenter(line.endIndex);
    return `${start.x},${start.y} ${end.x},${end.y}`;
  });

  constructor(public readonly i18n: I18nService) {}

  play(index: number): void {
    if (this.board()[index] || !this.canContinue()) {
      return;
    }

    const player: Player = this.currentPlayer();
    const nextBoard: Cell[] = [...this.board()];
    nextBoard[index] = player;
    this.board.set(nextBoard);
    this.updateGameState(index, nextBoard, player);

    if (this.canContinue()) {
      this.currentPlayer.set(player === 'X' ? 'O' : 'X');
    }
  }

  selectMode(mode: GameMode): void {
    if (this.selectedMode().id === mode.id) {
      return;
    }

    this.selectedMode.set(mode);
    this.resetMatch();
  }

  resetRound(): void {
    this.board.set(createBoard(this.selectedMode()));
    this.currentPlayer.set('X');
    this.winner.set(null);
    this.winningLine.set(null);
    this.isDraw.set(false);
  }

  resetMatch(): void {
    this.score.set({ X: 0, O: 0 });
    this.resetRound();
  }

  cellX(index: number): number {
    return cellX(index, this.selectedMode(), this.cellSize());
  }

  cellY(index: number): number {
    return cellY(index, this.selectedMode(), this.cellSize());
  }

  gridPosition(line: number): number {
    return line * this.cellSize();
  }

  markPadding(): number {
    return this.metrics().markPadding;
  }

  circleRadius(): number {
    return this.metrics().circleRadius;
  }

  markStroke(): number {
    return this.metrics().markStroke;
  }

  gridStroke(): number {
    return this.metrics().gridStroke;
  }

  winStroke(): number {
    return this.metrics().winStroke;
  }

  private updateGameState(lastMove: number, board: Cell[], player: Player): void {
    const line: WinningLine | null = findWinningLine(lastMove, board, player, this.selectedMode());

    if (line) {
      this.winner.set(player);
      this.winningLine.set(line);
      this.score.update((score: Score): Score => ({
        ...score,
        [player]: score[player] + 1
      }));
      return;
    }

    this.isDraw.set(board.every(Boolean));
  }

  private cellCenter(index: number): BoardPoint {
    return cellCenter(index, this.selectedMode(), this.cellSize());
  }
}
