export type * from '@simple-games/pet-contract';

// Внутренний разобранный курсор; HTTP-клиент получает непрозрачную строку.
export interface PetHistoryCursor {
  appliedAt: string;
  id: string;
}
