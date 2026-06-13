import { PetId, PetMode, SessionLengthId } from '../pocket-pet/pocket-pet.model';

export type PetStatus = 'pet' | 'grown' | 'left';
export type PetMood = 'joyful' | 'neutral' | 'angry' | 'upset' | 'thoughtful' | 'irritated';
export type PetPeriodOfLife = 'child' | 'teen' | 'adult';
export type PetCareActionId = 'feed' | 'clean' | 'play';
export type PetStatId = 'satiety' | 'cleanliness' | 'happiness';
export type PetFarewellReason = 'grown-up' | 'lack-of-care';
export type PetFarewellPhraseId = 'bright-future' | 'ready-for-adventure' | 'needed-more-care';

export interface PetStats {
  satiety: number;
  cleanliness: number;
  happiness: number;
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
  lastActionAt: PetLastActionAt;
  careHistory: PetCareActionEntry[];
  farewell: PetFarewellResult | null;
}

export type PetCareActionFailureReason = 'cooldown' | 'inactive';

export interface PetCareActionResult {
  pet: OwnedPet;
  actionId: PetCareActionId;
  applied: boolean;
  reason: PetCareActionFailureReason | null;
  nextAvailableAt: string | null;
}
