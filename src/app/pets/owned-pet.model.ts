import { PetId, PetMode, SessionLengthId } from '../pocket-pet/pocket-pet.model';

export type PetStatus = 'pet' | 'grown' | 'left';

export interface OwnedPet {
  id: string;
  name: string;
  petId: PetId;
  mode: PetMode;
  status: PetStatus;
  sessionLengthId: SessionLengthId;
  createdAt: string;
  endsAt: string;
}
