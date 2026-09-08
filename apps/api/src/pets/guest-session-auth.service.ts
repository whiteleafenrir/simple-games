import { Inject, Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';

import { GuestSession } from './pet-domain.types';
import { POCKET_PET_REPOSITORY, PocketPetRepository } from './pocket-pet.repository';

export const GUEST_SESSION_COOKIE = 'simple_games_guest_token';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
const TOKEN_PATTERN = /^[a-f0-9]{64}$/;

@Injectable()
export class GuestSessionAuthService {
  constructor(
    @Inject(POCKET_PET_REPOSITORY)
    private readonly repository: PocketPetRepository
  ) {}

  async createOrRestore(cookieHeader: string | undefined, now: Date = new Date()): Promise<{ session: GuestSession; cookie: string }> {
    const token = readGuestToken(cookieHeader);
    const expiresAt = new Date(now.getTime() + COOKIE_MAX_AGE_SECONDS * 1000);

    if (token) {
      const tokenHash = hashToken(token);
      const existing = await this.repository.findGuestSessionByTokenHash(tokenHash, now);
      if (existing) {
        const session = await this.repository.renewGuestSessionToken(existing.id, tokenHash, expiresAt, now);
        if (session) {
          return { session, cookie: serializeGuestCookie(token) };
        }
      }
    }

    const newToken = randomBytes(32).toString('hex');
    const session = await this.repository.createAuthenticatedGuestSession(hashToken(newToken), expiresAt, now);
    return { session, cookie: serializeGuestCookie(newToken) };
  }

  authenticate(cookieHeader: string | undefined, now: Date = new Date()): Promise<GuestSession | null> {
    const token = readGuestToken(cookieHeader);
    return token ? this.repository.findGuestSessionByTokenHash(hashToken(token), now) : Promise.resolve(null);
  }
}

function readGuestToken(cookieHeader: string | undefined): string | null {
  const cookies = cookieHeader?.split(';').map((part) => part.trim())
    .filter((part) => part.startsWith(`${GUEST_SESSION_COOKIE}=`));
  // Reject ambiguous credentials instead of depending on cookie ordering.
  if (!cookies || cookies.length !== 1) {
    return null;
  }
  try {
    const token = decodeURIComponent(cookies[0].slice(GUEST_SESSION_COOKIE.length + 1));
    return TOKEN_PATTERN.test(token) ? token : null;
  } catch {
    return null;
  }
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function serializeGuestCookie(token: string): string {
  return [
    `${GUEST_SESSION_COOKIE}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${COOKIE_MAX_AGE_SECONDS}`,
    ...(process.env.NODE_ENV === 'production' ? ['Secure'] : [])
  ].join('; ');
}
