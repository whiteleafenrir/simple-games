import { BadRequestException } from '@nestjs/common';
import { PetCareActionEntry, PetHistoryCursor, PetHistoryPage } from './pet-domain.types';

export const HISTORY_PAGE_SIZE = 50;

export function parseHistoryCursor(value: unknown): PetHistoryCursor | null {
  if (value === undefined) return null;
  try {
    if (typeof value !== 'string' || value.length > 512 || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error();
    const parsed: unknown = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
    if (!Array.isArray(parsed) || parsed.length !== 2) throw new Error();
    const [appliedAt, id]: unknown[] = parsed;
    if (typeof appliedAt !== 'string' || new Date(appliedAt).toISOString() !== appliedAt ||
      typeof id !== 'string' || id.length === 0 || id.length > 200) throw new Error();
    return { appliedAt, id };
  } catch {
    throw new BadRequestException('Invalid history cursor.');
  }
}

export function historyPage(entries: PetCareActionEntry[]): PetHistoryPage {
  const items = entries.slice(0, HISTORY_PAGE_SIZE);
  const last = items.at(-1);
  return {
    items,
    nextCursor: entries.length > HISTORY_PAGE_SIZE && last
      ? Buffer.from(JSON.stringify([last.appliedAt, last.id])).toString('base64url') : null
  };
}
