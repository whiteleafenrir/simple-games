import { TranslationKey } from '../i18n/translations';

import type { PetId, PetMode, SessionLengthId } from '@simple-games/pet-contract';

export type { PetId, PetMode, SessionLengthId } from '@simple-games/pet-contract';

export interface SessionLength {
  id: SessionLengthId;
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  minutes: number;
}

export interface PetOption {
  id: PetId;
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  modeKey: TranslationKey;
  mode: PetMode;
  disabled: boolean;
  accent: 'blue' | 'green' | 'gold' | 'ember';
}
