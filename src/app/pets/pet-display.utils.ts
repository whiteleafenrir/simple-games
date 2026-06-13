import { TranslationKey } from '../i18n/translations';
import { PET_OPTIONS, SESSION_LENGTHS } from '../pocket-pet/pocket-pet.config';
import { PetOption, SessionLength } from '../pocket-pet/pocket-pet.model';
import {
  OwnedPet,
  PetCareActionId,
  PetFarewellPhraseId,
  PetFarewellReason,
  PetMood,
  PetPeriodOfLife,
  PetStatId,
  PetStatus
} from './owned-pet.model';

export const PET_STAT_IDS: readonly PetStatId[] = ['satiety', 'cleanliness', 'happiness'] as const;

export function petOption(ownedPet: OwnedPet): PetOption {
  return PET_OPTIONS.find((pet: PetOption): boolean => pet.id === ownedPet.petId) ?? PET_OPTIONS[0];
}

export function sessionLength(ownedPet: OwnedPet): SessionLength {
  return SESSION_LENGTHS.find((session: SessionLength): boolean => session.id === ownedPet.sessionLengthId) ?? SESSION_LENGTHS[0];
}

export function petStatusKey(status: PetStatus): TranslationKey {
  if (status === 'grown') {
    return 'petStatusGrown';
  }

  if (status === 'left') {
    return 'petStatusLeft';
  }

  return 'petStatusPet';
}

export function petMoodKey(mood: PetMood): TranslationKey {
  const moodKeys: Record<PetMood, TranslationKey> = {
    joyful: 'petMoodJoyful',
    neutral: 'petMoodNeutral',
    angry: 'petMoodAngry',
    upset: 'petMoodUpset',
    thoughtful: 'petMoodThoughtful',
    irritated: 'petMoodIrritated'
  };

  return moodKeys[mood];
}

export function petPeriodOfLifeKey(periodOfLife: PetPeriodOfLife): TranslationKey {
  if (periodOfLife === 'child') {
    return 'petPeriodChild';
  }

  if (periodOfLife === 'adult') {
    return 'petPeriodAdult';
  }

  return 'petPeriodTeen';
}

export function petStatKey(statId: PetStatId): TranslationKey {
  if (statId === 'satiety') {
    return 'petStatSatiety';
  }

  if (statId === 'cleanliness') {
    return 'petStatCleanliness';
  }

  return 'petStatHappiness';
}

export function petCareActionKey(actionId: PetCareActionId): TranslationKey {
  if (actionId === 'feed') {
    return 'feedPet';
  }

  if (actionId === 'clean') {
    return 'cleanPet';
  }

  return 'playWithPet';
}

export function petCareActionHintKey(actionId: PetCareActionId): TranslationKey {
  if (actionId === 'feed') {
    return 'feedPetHint';
  }

  if (actionId === 'clean') {
    return 'cleanPetHint';
  }

  return 'playWithPetHint';
}

export function petFarewellReasonKey(reason: PetFarewellReason): TranslationKey {
  if (reason === 'grown-up') {
    return 'petFarewellReasonGrownUp';
  }

  return 'petFarewellReasonLackOfCare';
}

export function petFarewellPhraseKey(phraseId: PetFarewellPhraseId): TranslationKey {
  if (phraseId === 'bright-future') {
    return 'petFarewellPhraseBrightFuture';
  }

  if (phraseId === 'ready-for-adventure') {
    return 'petFarewellPhraseReadyForAdventure';
  }

  return 'petFarewellPhraseNeededMoreCare';
}
