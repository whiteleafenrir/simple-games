import { TranslationKey } from '../i18n/translations';

export type PetId = 'cat' | 'dog' | 'parrot' | 'dinosaur' | 'dragon';
export type PetMode = 'easy' | 'medium' | 'insane';
export type SessionLengthId = 'short' | 'standard' | 'long';

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
