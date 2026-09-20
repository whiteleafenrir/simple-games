import { OwnedPet, PetActionAvailability, PetCareActionId, PetSnapshot } from './pet-domain.types';
import { careActionCooldownRemainingMs, careActionFailureReason, PET_CARE_ACTIONS, PET_CARE_ACTION_IDS, petAwayRemainingMs, playerEnergyRecoveryRemainingMs } from './pet-engine';
import { QUESTION_ACTIVITY_RULES, questionFailureReason, questionReadyAt } from './pet-question-rules';
import { PocketPetTransaction } from './pocket-pet.repository';

// Presentation only: call after resolve, and never persist this snapshot.
export async function petSnapshot(tx: PocketPetTransaction, pet: OwnedPet, now: Date): Promise<PetSnapshot> {
  const care = Object.fromEntries(PET_CARE_ACTION_IDS.map(id => [id, careAvailability(pet, id, now)])) as Record<PetCareActionId, PetActionAvailability>;
  let reason = questionFailureReason(pet);
  let nextAvailableAt = reason === 'away' ? pet.awayUntil : null;
  if (!reason) {
    const latest = await tx.latestQuestion(pet.id);
    if (latest?.completedAt) {
      const readyAt = questionReadyAt(latest.completedAt);
      if (Date.parse(readyAt) > now.getTime()) {
        reason = 'cooldown';
        nextAvailableAt = readyAt;
      }
    }
  }
  return {
    ...pet,
    actions: {
      ...care,
      questions: {
        available: !reason, reason, nextAvailableAt,
        playerEnergyCost: QUESTION_ACTIVITY_RULES.playerEnergyCost,
        cooldownMinutes: QUESTION_ACTIVITY_RULES.cooldownMinutes
      }
    }
  };
}

function careAvailability(pet: OwnedPet, id: PetCareActionId, now: Date): PetActionAvailability {
  const action = PET_CARE_ACTIONS[id];
  const reason = careActionFailureReason(pet, id, now);
  const remaining = reason && reason !== 'inactive' && reason !== 'sleeping'
    ? Math.max(
      careActionCooldownRemainingMs(pet, id, now),
      playerEnergyRecoveryRemainingMs(pet, id, now),
      action.allowWhenAway ? 0 : petAwayRemainingMs(pet, now)
    ) : 0;
  return {
    available: !reason, reason,
    playerEnergyCost: action.playerEnergyCost,
    cooldownMinutes: action.cooldownMinutes,
    nextAvailableAt: remaining > 0 ? new Date(now.getTime() + remaining).toISOString() : null
  };
}
