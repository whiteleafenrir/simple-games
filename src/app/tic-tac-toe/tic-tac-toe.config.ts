import { GameMode } from './tic-tac-toe.model';

export const GAME_MODES: readonly GameMode[] = [
  {
    id: 'classic',
    titleKey: 'classicModeTitle',
    descriptionKey: 'classicModeDescription',
    boardSize: 3,
    winLength: 3
  },
  {
    id: 'five-in-row',
    titleKey: 'fiveInRowModeTitle',
    descriptionKey: 'fiveInRowModeDescription',
    boardSize: 20,
    winLength: 5
  }
] as const;

export const DEFAULT_GAME_MODE: GameMode = GAME_MODES[0];
export const BOARD_VIEW_BOX_SIZE = 600;
