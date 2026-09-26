import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, signal } from '@angular/core';
import { I18nService } from '../i18n/i18n.service';
import { DEFAULT_GAME_MODE } from '../tic-tac-toe/tic-tac-toe.config';
import { Cell, Player } from '../tic-tac-toe/tic-tac-toe.model';
import { createBoard, findWinningLine } from '../tic-tac-toe/tic-tac-toe.rules';
import { choosePetMove } from '../tic-tac-toe/tic-tac-toe.bot';

@Component({
  selector: 'app-pet-tic-tac-toe',
  templateUrl: './pet-tic-tac-toe.component.html',
  styleUrl: './pet-tic-tac-toe.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PetTicTacToeComponent {
  readonly petName = input.required<string>();
  readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);
  private timer: ReturnType<typeof setTimeout> | null = null;
  readonly board = signal<Cell[]>(createBoard(DEFAULT_GAME_MODE));
  readonly winner = signal<Player | null>(null);
  readonly thinking = signal(false);
  readonly winningCells = signal<number[]>([]);
  readonly finished = computed(() => !!this.winner() || this.board().every(Boolean));
  readonly status = computed(() => this.i18n.t(this.winner() === 'X' ? 'petGameYouWon' : this.winner() === 'O' ? 'petGamePetWon' : this.finished() ? 'petGameDraw' : this.thinking() ? 'petGameThinking' : 'petGameYourTurn'));

  constructor() { this.destroyRef.onDestroy(() => this.clearTimer()); }

  play(index: number): void {
    if (this.board()[index] !== null || this.finished() || this.thinking()) return;
    this.place(index, 'X');
    if (this.finished()) return;
    this.thinking.set(true);
    this.timer = setTimeout(() => {
      this.timer = null;
      const move = choosePetMove(this.board());
      if (move !== null) this.place(move, 'O');
      this.thinking.set(false);
    }, 550);
  }

  newRound(): void {
    this.clearTimer();
    this.thinking.set(false);
    this.board.set(createBoard(DEFAULT_GAME_MODE));
    this.winner.set(null);
    this.winningCells.set([]);
  }

  private place(index: number, player: Player): void {
    const next = [...this.board()];
    next[index] = player;
    this.board.set(next);
    const line = findWinningLine(index, next, player, DEFAULT_GAME_MODE);
    if (line) {
      this.winner.set(player);
      const step = (line.endIndex - line.startIndex) / 2;
      this.winningCells.set([line.startIndex, line.startIndex + step, line.endIndex]);
    }
  }

  private clearTimer(): void { if (this.timer !== null) clearTimeout(this.timer); this.timer = null; }
}
