import { PetAppearance, PetCoatColor, PetCoatPattern } from './owned-pet.model';
import { TranslationKey } from '../i18n/translations';

export const DEFAULT_APPEARANCE: PetAppearance = { color: 'natural', pattern: 'plain' };
export const COAT_COLORS: readonly { id: PetCoatColor; label: TranslationKey; swatch: string; accent: string; outline: string }[] = [
  { id: 'natural', label: 'coatNatural', swatch: '#dcad79', accent: '#bc8556', outline: '#704e39' },
  { id: 'honey', label: 'coatHoney', swatch: '#e9bc68', accent: '#b77b35', outline: '#79552d' },
  { id: 'ash', label: 'coatAsh', swatch: '#aeb9c5', accent: '#6e829b', outline: '#4c5b70' },
  { id: 'rose', label: 'coatRose', swatch: '#dfa4a8', accent: '#b87583', outline: '#805565' },
  { id: 'lavender', label: 'coatLavender', swatch: '#b9a6d4', accent: '#8973ae', outline: '#62517d' },
  { id: 'mint', label: 'coatMint', swatch: '#9cc9b5', accent: '#629b86', outline: '#416e60' }
];
export const COAT_PATTERNS: readonly { id: PetCoatPattern; label: TranslationKey }[] = [
  { id: 'plain', label: 'coatPlain' }, { id: 'spots', label: 'coatSpots' }, { id: 'stripes', label: 'coatStripes' }
];

/** Cosmetic draft only; always choose a different combination. */
export function randomPetAppearance(current: PetAppearance): PetAppearance {
  const choices = COAT_COLORS.flatMap(({ id: color }) =>
    COAT_PATTERNS.map(({ id: pattern }) => ({ color, pattern }))
  ).filter(choice => choice.color !== current.color || choice.pattern !== current.pattern);
  return choices[Math.floor(Math.random() * choices.length)]!;
}

/** Presentation only: cleanliness is calculated exclusively by the server. */
export function dirtOpacity(cleanliness: number): number {
  return Number.isFinite(cleanliness) ? Math.max(0, Math.min(1, (70 - cleanliness) / 45)) : 0;
}
