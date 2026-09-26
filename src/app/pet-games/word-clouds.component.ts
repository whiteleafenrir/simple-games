import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { I18nService } from '../i18n/i18n.service';
import { TRANSLATIONS } from '../i18n/translations';
import { chooseWord, guessLetter, WORD_ALPHABETS, WORD_MISS_LIMIT, WordRound, wordMisses, wordOutcome } from './word-clouds.rules';

@Component({
  selector: 'app-word-clouds',
  templateUrl: './word-clouds.component.html',
  styleUrl: './word-clouds.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown)': 'onKeydown($event)' }
})
export class WordCloudsComponent {
  readonly i18n = inject(I18nService);
  readonly round = signal<WordRound | null>(null);
  readonly alphabet = computed(() => [...WORD_ALPHABETS[this.round()?.language ?? this.i18n.language()]]);
  readonly outcome = computed(() => { const round = this.round(); return round ? wordOutcome(round) : 'playing'; });
  readonly misses = computed(() => { const round = this.round(); return round ? wordMisses(round) : 0; });
  readonly remaining = computed(() => WORD_MISS_LIMIT - this.misses());
  readonly letters = computed(() => {
    const round = this.round();
    return round ? [...round.word].map(letter => ({ letter, visible: this.outcome() !== 'playing' || round.guesses.includes(letter) })) : [];
  });
  readonly spokenWord = computed(() => this.letters().map(item => item.visible ? item.letter : this.i18n.t('wordHiddenLetter')).join(', '));
  readonly clouds = [
    { x: 76, y: 50 }, { x: 180, y: 50 }, { x: 58, y: 98 },
    { x: 200, y: 98 }, { x: 126, y: 64 }, { x: 128, y: 99 }
  ];

  constructor() {
    effect(() => {
      const language = this.i18n.language();
      untracked(() => this.newRound(language));
    });
  }

  newRound(language = this.i18n.language()): void {
    const entry = chooseWord(this.round()?.entry.wordKey);
    this.round.set({ entry, word: TRANSLATIONS[language][entry.wordKey].toLocaleUpperCase(language), language, guesses: [] });
  }

  guess(letter: string): void { this.round.update(round => round ? guessLetter(round, letter) : round); }

  onKeydown(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey || event.altKey || event.repeat || event.isComposing || event.key.length !== 1) return;
    const target = event.target;
    if (target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return;
    const letter = event.key.toLocaleUpperCase(this.round()?.language);
    if (this.alphabet().includes(letter)) { event.preventDefault(); this.guess(letter); }
  }
}
