import { PetId, PetMode, SessionLengthId } from '../pocket-pet/pocket-pet.model';

export type PetStatus = 'pet' | 'grown' | 'left';
export type PetMood = 'joyful' | 'neutral' | 'angry' | 'upset' | 'thoughtful' | 'irritated';
export type PetPeriodOfLife = 'child' | 'teen' | 'adult';

export interface OwnedPet {
  id: string;
  name: string;
  petId: PetId;
  mode: PetMode;
  status: PetStatus;
  mood: PetMood;
  periodOfLife: PetPeriodOfLife;
  sessionLengthId: SessionLengthId;
  createdAt: string;
  endsAt: string;
}
