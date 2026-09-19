import { OwnedPet } from './pet-domain.types';
import { normalizeStats, petMood } from './pet-engine';
import { changePetTrust } from './pet-trust';

export type QuestionOutcome = 'correct' | 'incorrect' | 'declined';

// Provisional Q1 values, kept on the server. Attempt validation belongs to Q2.
export const QUESTION_ACTIVITY_RULES = {
  playerEnergyCost: 0,
  cooldownMinutes: 30,
  outcomes: {
    correct: { happiness: 5, trust: 2, activityCompleted: true },
    incorrect: { happiness: 5, trust: -1, activityCompleted: true },
    declined: { happiness: -3, trust: 0, activityCompleted: false }
  }
} as const;

export interface QuestionOutcomeState extends Pick<OwnedPet, 'stats' | 'trust' | 'mood'> {
  activityCompleted: boolean;
}

// Pure calculation for a server-verified outcome, not a command to award credit.
// Q2 must validate the active attempt and persist its outcome exactly once.
export function resolveQuestionOutcome(
  pet: Pick<OwnedPet, 'stats' | 'trust'>,
  outcome: QuestionOutcome
): QuestionOutcomeState {
  const effect = QUESTION_ACTIVITY_RULES.outcomes[outcome];
  const stats = normalizeStats({ ...pet.stats, happiness: pet.stats.happiness + effect.happiness });
  return {
    stats,
    trust: changePetTrust(pet.trust, effect.trust),
    mood: petMood(stats),
    activityCompleted: effect.activityCompleted
  };
}
