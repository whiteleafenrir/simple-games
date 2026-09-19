// Q1 starting balance; trust is independent of care score and time decay.
export const PET_TRUST = { initial: 50, min: 0, max: 100 } as const;

export function changePetTrust(trust: number, delta: number): number {
  if (!Number.isFinite(trust) || trust < PET_TRUST.min || trust > PET_TRUST.max || !Number.isFinite(delta)) {
    throw new Error('Invalid trust value or change.');
  }
  return Math.max(PET_TRUST.min, Math.min(PET_TRUST.max, trust + delta));
}
