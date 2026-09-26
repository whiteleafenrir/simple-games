import type { Language, TranslationKey } from '../i18n/translations';

export const WORD_MISS_LIMIT = 6;
export const WORD_ALPHABETS: Record<Language, string> = {
  ru: 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ',
  en: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
};

export interface WordEntry { wordKey: TranslationKey; hintKey: TranslationKey; }
export interface WordRound { entry: WordEntry; word: string; language: Language; guesses: readonly string[]; }
export type WordOutcome = 'playing' | 'won' | 'revealed';

export const WORD_ENTRIES: readonly WordEntry[] = [
  ...(['wordCat', 'wordDog', 'wordFox', 'wordBear', 'wordLion', 'wordOwl', 'wordFish', 'wordHedgehog'] as const)
    .map(wordKey => ({ wordKey, hintKey: 'wordHintAnimal' as const })),
  ...(['wordSun', 'wordMoon', 'wordCloud', 'wordStar', 'wordRain', 'wordSnow', 'wordWind'] as const)
    .map(wordKey => ({ wordKey, hintKey: 'wordHintNature' as const })),
  ...(['wordApple', 'wordPear', 'wordPlum', 'wordBread', 'wordMilk'] as const)
    .map(wordKey => ({ wordKey, hintKey: 'wordHintFood' as const })),
  ...(['wordBall', 'wordKite'] as const).map(wordKey => ({ wordKey, hintKey: 'wordHintToy' as const })),
  ...(['wordHouse', 'wordBook'] as const).map(wordKey => ({ wordKey, hintKey: 'wordHintHome' as const }))
];

export function chooseWord(previousKey?: TranslationKey, random = Math.random): WordEntry {
  const choices = WORD_ENTRIES.filter(entry => entry.wordKey !== previousKey);
  return choices[Math.floor(random() * choices.length)];
}

export function wordMisses(round: WordRound): number {
  return round.guesses.filter(letter => !round.word.includes(letter)).length;
}

export function wordOutcome(round: WordRound): WordOutcome {
  if ([...round.word].every(letter => round.guesses.includes(letter))) return 'won';
  return wordMisses(round) >= WORD_MISS_LIMIT ? 'revealed' : 'playing';
}

export function guessLetter(round: WordRound, value: string): WordRound {
  const letter = value.toLocaleUpperCase(round.language);
  if (wordOutcome(round) !== 'playing' || letter.length !== 1 || !WORD_ALPHABETS[round.language].includes(letter) || round.guesses.includes(letter)) return round;
  return { ...round, guesses: [...round.guesses, letter] };
}
