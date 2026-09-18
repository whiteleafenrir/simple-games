import type { PetCareActionId } from '@simple-games/pet-contract';

export type * from '@simple-games/pet-contract';

export const PET_CARE_ACTION_IDS: readonly PetCareActionId[] = [
  'feed',
  'junkFood',
  'clean',
  'play',
  'walk',
  'toggleLight'
] as const;
