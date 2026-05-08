export type Player = 'X' | 'O';
export type Cell = Player | null;
export type GameModeId = 'classic' | 'five-in-row';
export type Score = Record<Player, number>;
export type ModeTranslationKey =
  | 'classicModeTitle'
  | 'classicModeDescription'
  | 'fiveInRowModeTitle'
  | 'fiveInRowModeDescription';

export interface WinningLine {
  startIndex: number;
  endIndex: number;
}

export interface GameMode {
  id: GameModeId;
  titleKey: ModeTranslationKey;
  descriptionKey: ModeTranslationKey;
  boardSize: number;
  winLength: number;
}

export interface BoardDirection {
  row: number;
  col: number;
}
