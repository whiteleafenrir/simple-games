import { PetId } from '../pocket-pet/pocket-pet.model';
import { PetCareActionId, PetStats } from './owned-pet.model';

type PetStatMultipliers = Record<keyof PetStats, number>;
type PetCareActionMultipliers = Record<PetCareActionId, number>;

export interface PetSpeciesTraits {
  id: PetId;
  careActionEffectMultipliers: PetCareActionMultipliers;
  statGainMultipliers: PetStatMultipliers;
  statLossMultipliers: PetStatMultipliers;
  decayMultipliers: PetStatMultipliers;
  restRecoveryMultiplier: number;
}

const DEFAULT_STAT_MULTIPLIERS: PetStatMultipliers = {
  satiety: 1,
  cleanliness: 1,
  happiness: 1,
  health: 1,
  energy: 1
};

const DEFAULT_CARE_ACTION_MULTIPLIERS: PetCareActionMultipliers = {
  feed: 1,
  junkFood: 1,
  clean: 1,
  play: 1,
  walk: 1,
  toggleLight: 1
};

export const PET_SPECIES_TRAITS: Record<PetId, PetSpeciesTraits> = {
  cat: createNeutralSpeciesTraits('cat'),
  dog: createNeutralSpeciesTraits('dog'),
  parrot: createNeutralSpeciesTraits('parrot'),
  dinosaur: createNeutralSpeciesTraits('dinosaur'),
  dragon: createNeutralSpeciesTraits('dragon')
};

export function petSpeciesTraits(petId: PetId): PetSpeciesTraits {
  return PET_SPECIES_TRAITS[petId] ?? PET_SPECIES_TRAITS.cat;
}

function createNeutralSpeciesTraits(id: PetId): PetSpeciesTraits {
  return {
    id,
    careActionEffectMultipliers: { ...DEFAULT_CARE_ACTION_MULTIPLIERS },
    statGainMultipliers: { ...DEFAULT_STAT_MULTIPLIERS },
    statLossMultipliers: { ...DEFAULT_STAT_MULTIPLIERS },
    decayMultipliers: { ...DEFAULT_STAT_MULTIPLIERS },
    restRecoveryMultiplier: 1
  };
}
