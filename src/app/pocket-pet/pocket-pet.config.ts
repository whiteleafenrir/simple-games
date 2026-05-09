import { PetOption, SessionLength } from './pocket-pet.model';

export const SESSION_LENGTHS: readonly SessionLength[] = [
  {
    id: 'short',
    titleKey: 'petSessionShort',
    descriptionKey: 'petSessionShortDescription',
    minutes: 1440
  },
  {
    id: 'standard',
    titleKey: 'petSessionStandard',
    descriptionKey: 'petSessionStandardDescription',
    minutes: 4320
  },
  {
    id: 'long',
    titleKey: 'petSessionLong',
    descriptionKey: 'petSessionLongDescription',
    minutes: 10080
  }
] as const;

export const PET_OPTIONS: readonly PetOption[] = [
  {
    id: 'cat',
    titleKey: 'petCat',
    descriptionKey: 'petCatDescription',
    modeKey: 'petModeEasy',
    mode: 'easy',
    disabled: false,
    accent: 'green'
  },
  {
    id: 'dog',
    titleKey: 'petDog',
    descriptionKey: 'petDogDescription',
    modeKey: 'petModeEasy',
    mode: 'easy',
    disabled: false,
    accent: 'blue'
  },
  {
    id: 'parrot',
    titleKey: 'petParrot',
    descriptionKey: 'petParrotDescription',
    modeKey: 'petModeEasy',
    mode: 'easy',
    disabled: false,
    accent: 'gold'
  },
  {
    id: 'dragon',
    titleKey: 'petDragon',
    descriptionKey: 'petDragonDescription',
    modeKey: 'petModeInsane',
    mode: 'insane',
    disabled: true,
    accent: 'ember'
  }
] as const;
