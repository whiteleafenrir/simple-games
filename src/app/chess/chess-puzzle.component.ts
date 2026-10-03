import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChildren
} from '@angular/core';
import { I18nService } from '../i18n/i18n.service';
import type { TranslationKey } from '../i18n/translations';
import { inspectChessGame } from './chess-engine';
import type { ChessCell, ChessMove, ChessPieceType, ChessSquare } from './chess-engine';
import { createPuzzleRound, nextPuzzleMove, revealPuzzle, submitPuzzleMove } from './chess-puzzles';
import type { ChessPuzzleRound } from './chess-puzzles';
import type { ChessDifficulty } from '@simple-games/pet-contract';
import { ChessApiService } from './chess-api.service';

const PIECE_KEYS: Record<ChessPieceType, TranslationKey> = {
  k: 'chessKing',
  q: 'chessQueen',
  r: 'chessRook',
  b: 'chessBishop',
  n: 'chessKnight',
  p: 'chessPawn'
};
const PIECE_GLYPHS: Record<ChessPieceType, string> = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };

@Component({
  selector: 'app-chess-puzzle',
  templateUrl: './chess-puzzle.component.html',
  styleUrl: './chess-puzzle.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChessPuzzleComponent {
  readonly i18n = inject(I18nService);
  private readonly api = inject(ChessApiService);
  private readonly destroyRef = inject(DestroyRef);
  readonly round = signal<ChessPuzzleRound | null>(null);
  readonly difficulty = signal<ChessDifficulty>('easy');
  readonly levels: readonly { value: ChessDifficulty; label: TranslationKey }[] = [
    { value: 'easy', label: 'chessEasy' },
    { value: 'medium', label: 'chessMedium' },
    { value: 'hard', label: 'chessHard' }
  ];
  readonly loading = signal(false);
  readonly loadMessage = signal<TranslationKey | null>(null);
  readonly selected = signal<ChessSquare | null>(null);
  readonly hintSquare = signal<ChessSquare | null>(null);
  readonly feedback = signal<TranslationKey>('chessReady');
  readonly promotionMoves = signal<readonly ChessMove[]>([]);
  readonly view = computed(() => {
    const round = this.round();
    return round ? inspectChessGame(round.game) : null;
  });
  readonly cells = computed(() => {
    const board = this.view()?.board ?? [];
    return this.round()?.player === 'b' ? [...board].reverse() : board;
  });
  readonly focused = signal<ChessSquare>('a8');
  readonly finished = computed(() => this.round()?.outcome !== 'playing');
  readonly targets = computed(
    () =>
      new Set((this.view()?.legalMoves ?? []).filter((move) => move.from === this.selected()).map((move) => move.to))
  );
  readonly lastMove = computed(() => this.round()?.game.moves.at(-1));
  private readonly squareButtons = viewChildren<ElementRef<HTMLButtonElement>>('squareButton');
  private readonly promotionButtons = viewChildren<ElementRef<HTMLButtonElement>>('promotionButton');

  constructor() {
    afterRenderEffect(() => {
      if (this.promotionMoves().length) this.promotionButtons()[0]?.nativeElement.focus();
    });
    void this.next();
  }

  selectSquare(square: ChessSquare): void {
    if (this.loading() || this.finished() || this.promotionMoves().length) return;
    this.focused.set(square);
    this.hintSquare.set(null);
    if (this.selected() === square) {
      this.selected.set(null);
      this.feedback.set('chessReady');
      return;
    }
    const piece = this.view()?.board.find((cell) => cell.square === square)?.piece;
    if (piece?.color === this.round()?.player) {
      this.selected.set(square);
      this.feedback.set('chessChooseTarget');
      return;
    }
    const from = this.selected();
    if (!from) return;
    const promotions = (this.view()?.legalMoves ?? []).filter(
      (move) => move.from === from && move.to === square && move.promotion
    );
    if (promotions.length) {
      this.promotionMoves.set(promotions);
      this.feedback.set('chessPromotion');
      return;
    }
    this.move({ from, to: square });
  }

  move(move: ChessMove): void {
    const round = this.round();
    if (!round || this.loading()) return;
    const result = submitPuzzleMove(round, move);
    this.round.set(result.round);
    if (result.feedback !== 'finished') {
      this.feedback.set(
        result.feedback === 'solved'
          ? 'chessSolved'
          : result.feedback === 'correct'
            ? 'chessCorrect'
            : result.feedback === 'try-again'
              ? 'chessTryAgain'
              : 'chessIllegal'
      );
    }
    this.promotionMoves.set([]);
    this.selected.set(null);
    this.hintSquare.set(null);
    this.focusSquare(move.to);
  }

  hint(): void {
    const round = this.round();
    if (!round || this.loading() || this.finished()) return;
    const move = nextPuzzleMove(round);
    if (!move) return;
    this.cancelPromotion();
    this.hintSquare.set(move.from);
    this.selected.set(move.from);
    this.feedback.set('chessHintMessage');
    this.focusSquare(move.from);
  }

  reveal(): void {
    const round = this.round();
    if (!round || this.loading()) return;
    this.round.set(revealPuzzle(round));
    this.clearSelection();
    this.feedback.set(this.round()?.outcome === 'solved' ? 'chessSolved' : 'chessRevealed');
  }

  restart(): void {
    const round = this.round();
    if (!round || this.loading()) return;
    this.round.set(createPuzzleRound(round.puzzle));
    this.resetBoard();
  }
  async next(level = this.difficulty()): Promise<void> {
    if (this.loading()) return;
    this.loading.set(true);
    this.loadMessage.set(null);
    try {
      const response = await this.api.random(level, this.round()?.puzzle.id);
      if (this.destroyRef.destroyed) return;
      const round = response.puzzle ? createPuzzleRound(response.puzzle) : null;
      this.round.set(round);
      this.difficulty.set(level);
      this.resetBoard();
      if (!round) this.loadMessage.set('chessEmptyCatalog');
    } catch {
      if (!this.destroyRef.destroyed) this.loadMessage.set('chessLoadError');
    } finally {
      if (!this.destroyRef.destroyed) this.loading.set(false);
    }
  }

  cancelPromotion(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.promotionMoves.set([]);
    const selected = this.selected();
    if (selected) {
      this.feedback.set('chessChooseTarget');
      this.focusSquare(selected);
    }
  }

  onBoardKey(event: KeyboardEvent, square: ChessSquare): void {
    const index = this.cells().findIndex((cell) => cell.square === square);
    const row = Math.floor(index / 8);
    const column = index % 8;
    let target = index;
    switch (event.key) {
      case 'ArrowLeft':
        target = row * 8 + Math.max(0, column - 1);
        break;
      case 'ArrowRight':
        target = row * 8 + Math.min(7, column + 1);
        break;
      case 'ArrowUp':
        target = Math.max(0, row - 1) * 8 + column;
        break;
      case 'ArrowDown':
        target = Math.min(7, row + 1) * 8 + column;
        break;
      case 'Home':
        target = row * 8;
        break;
      case 'End':
        target = row * 8 + 7;
        break;
      case 'Escape':
        if (!this.selected() && !this.hintSquare() && !this.promotionMoves().length) return;
        event.stopPropagation();
        this.clearSelection();
        if (!this.finished()) this.feedback.set('chessReady');
        break;
      default:
        return;
    }
    event.preventDefault();
    this.focusSquare(this.cells()[target].square);
  }

  cellLabel(cell: ChessCell): string {
    const piece = cell.piece;
    const contents = piece
      ? `${this.i18n.t(piece.color === 'w' ? 'chessWhite' : 'chessBlack')}, ${this.i18n.t(PIECE_KEYS[piece.type])}`
      : this.i18n.t('chessEmpty');
    return `${cell.square}: ${contents}${this.targets().has(cell.square) ? `, ${this.i18n.t('chessLegalTarget')}` : ''}`;
  }

  pieceName(type: ChessPieceType): string {
    return this.i18n.t(PIECE_KEYS[type]);
  }
  glyph(type: ChessPieceType): string {
    return PIECE_GLYPHS[type];
  }
  isDark(square: ChessSquare): boolean {
    return (square.charCodeAt(0) + Number(square[1])) % 2 === 0;
  }

  private resetBoard(): void {
    this.clearSelection();
    this.feedback.set('chessReady');
    this.focused.set(this.cells()[0]?.square ?? 'a8');
  }

  private clearSelection(): void {
    this.selected.set(null);
    this.hintSquare.set(null);
    this.promotionMoves.set([]);
  }

  private focusSquare(square: ChessSquare): void {
    this.focused.set(square);
    const index = this.cells().findIndex((cell) => cell.square === square);
    this.squareButtons()[index]?.nativeElement.focus();
  }
}
