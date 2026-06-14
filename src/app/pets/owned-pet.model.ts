import { PetId, PetMode, SessionLengthId } from '../pocket-pet/pocket-pet.model';

export type PetStatus = 'pet' | 'grown' | 'left';
export type PetMood = 'joyful' | 'neutral' | 'angry' | 'upset' | 'thoughtful' | 'irritated';
export type PetPeriodOfLife = 'child' | 'teen' | 'adult';
export type PetCareActionId = 'feed' | 'junkFood' | 'clean' | 'play' | 'walk' | 'toggleLight';
export type PetActivityType = 'feeding' | 'treat' | 'cleaning' | 'play' | 'walk' | 'rest';
export type PetPerceptionTagId = 'basic-care' | 'indulgent' | 'engaged-care' | 'rest-routine';
export type PetStatId = 'satiety' | 'cleanliness' | 'happiness' | 'health' | 'energy';
export type PetFarewellReason = 'grown-up' | 'lack-of-care';
export type PetFarewellPhraseId = 'bright-future' | 'ready-for-adventure' | 'needed-more-care';

export interface PetStats {
  satiety: number;
  cleanliness: number;
  happiness: number;
  health: number;
  energy: number;
}

export interface PlayerEnergyState {
  current: number;
  max: number;
  lastRecoveredAt: string;
}

export type PetLastActionAt = Record<PetCareActionId, string | null>;

export interface PetFarewellResult {
  reason: PetFarewellReason;
  farewellAt: string;
  phraseId: PetFarewellPhraseId;
  finalCareScore: number;
  finalStats: PetStats;
}

export interface PetCareActionEntry {
  id: string;
  actionId: PetCareActionId;
  appliedAt: string;
  statsBefore: PetStats;
  statsAfter: PetStats;
  careScoreBefore: number;
  careScoreAfter: number;
  moodBefore: PetMood;
  moodAfter: PetMood;
  isLightOnBefore: boolean;
  isLightOnAfter: boolean;
  awayUntilBefore: string | null;
  awayUntilAfter: string | null;
}

export interface OwnedPet {
  id: string;
  name: string;
  petId: PetId;
  mode: PetMode;
  status: PetStatus;
  mood: PetMood;
  periodOfLife: PetPeriodOfLife;
  stats: PetStats;
  sessionLengthId: SessionLengthId;
  createdAt: string;
  endsAt: string;
  lastResolvedAt: string;
  playerEnergy: PlayerEnergyState;
  lastActionAt: PetLastActionAt;
  isLightOn: boolean;
  awayUntil: string | null;
  careHistory: PetCareActionEntry[];
  farewell: PetFarewellResult | null;
}

export type PetCareActionFailureReason = 'cooldown' | 'inactive' | 'away' | 'sleeping' | 'player-energy';

export interface PetCareActionResult {
  pet: OwnedPet;
  actionId: PetCareActionId;
  applied: boolean;
  reason: PetCareActionFailureReason | null;
  nextAvailableAt: string | null;
}
