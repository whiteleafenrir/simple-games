import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import type { TelegramLinkCode, TelegramLinkStatus } from '@simple-games/pet-contract';

import { TelegramLinkRepository } from './telegram-link.repository';

const CODE_LIFETIME_MS = 10 * 60_000;

@Injectable()
export class TelegramLinkService {
  constructor(private readonly repository: TelegramLinkRepository) {}

  async status(guestId: string): Promise<TelegramLinkStatus> {
    const code = await this.repository.find(guestId);
    return {
      availability: 'coming-soon',
      pendingCodeExpiresAt: code && code.expiresAt.getTime() > Date.now() ? code.expiresAt.toISOString() : null
    };
  }

  async createCode(guestId: string): Promise<TelegramLinkCode> {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + CODE_LIFETIME_MS);
    await this.repository.replace(guestId, createHash('sha256').update(token).digest('hex'), expiresAt);
    return { token, expiresAt: expiresAt.toISOString() };
  }

  async revokeCode(guestId: string): Promise<TelegramLinkStatus> {
    await this.repository.revoke(guestId);
    return { availability: 'coming-soon', pendingCodeExpiresAt: null };
  }
}
