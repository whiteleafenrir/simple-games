import { BadRequestException } from '@nestjs/common';
import { PetAppearance, PetCoatColor, PetCoatPattern } from './pet-domain.types';
import { parseRequestBody } from './request-body';
export const COAT_COLORS: readonly PetCoatColor[] = ['natural', 'honey', 'ash', 'rose', 'lavender', 'mint'];
export const COAT_PATTERNS: readonly PetCoatPattern[] = ['plain', 'spots', 'stripes'];
export function parseAppearance(value: unknown): PetAppearance {
  const body = parseRequestBody(value, ['color', 'pattern']);
  const color = COAT_COLORS.find(item => item === body['color']);
  const pattern = COAT_PATTERNS.find(item => item === body['pattern']);
  if (!color || !pattern) throw new BadRequestException('Pet appearance is invalid.');
  return { color, pattern };
}
