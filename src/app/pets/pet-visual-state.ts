import { PetAppearance, PetMood } from './owned-pet.model';
import { PetReactionKind } from './pet-reaction';

export type PetRenderer = 'auto' | 'svg' | '3d';
export type PetPose = 'default' | 'prowl' | 'walk';
export interface PetVisualState {
  mood: PetMood;
  appearance: PetAppearance;
  cleanliness: number;
  sleeping: boolean;
  animated: boolean;
  paused: boolean;
  calmJoy: boolean;
  reaction: PetReactionKind | null;
  interaction: 'petting' | null;
  pose: PetPose;
  yaw: number;
}
