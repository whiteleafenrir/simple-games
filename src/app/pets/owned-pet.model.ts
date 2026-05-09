import { PetId, PetMode, SessionLengthId } from '../pocket-pet/pocket-pet.model';

export type PetStatus = 'active' | 'resting' | 'needs-care';

export interface OwnedPet {
  id: string;
  petId: PetId;
  mode: PetMode;
  status: PetStatus;
  sessionLengthId: SessionLengthId;
  createdAt: string;
  endsAt: string;
}
