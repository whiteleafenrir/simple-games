import { Body, Controller, Get, Headers, Param, Post, Res } from '@nestjs/common';

import { GuestSession } from './pet-domain.types';
import { PocketPetService } from './pocket-pet.service';

interface GuestSessionRequest {
  guestId?: unknown;
}

interface GuestSessionResponse {
  setHeader(name: string, value: string): void;
}

const GUEST_SESSION_COOKIE = 'simple_games_guest_id';
const GUEST_SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

@Controller('guest-sessions')
export class GuestSessionsController {
  constructor(private readonly pocketPetService: PocketPetService) {}

  @Post()
  async createOrGetGuestSession(
    @Body() request: GuestSessionRequest | undefined,
    @Headers('cookie') cookieHeader: string | undefined,
    @Res({ passthrough: true }) response?: GuestSessionResponse
  ): Promise<GuestSession> {
    const session = await this.pocketPetService.createOrGetGuestSession(
      readCookie(cookieHeader, GUEST_SESSION_COOKIE) ?? request?.guestId
    );

    response?.setHeader('Set-Cookie', serializeGuestCookie(session.id));
    return session;
  }

  @Get(':guestId')
  getGuestSession(@Param('guestId') guestId: string): Promise<GuestSession> {
    return this.pocketPetService.getGuestSession(guestId);
  }
}

function readCookie(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) {
    return null;
  }

  const cookie = cookieHeader
    .split(';')
    .map((part: string): string => part.trim())
    .find((part: string): boolean => part.startsWith(`${name}=`));

  if (!cookie) {
    return null;
  }

  const value = cookie.slice(name.length + 1);

  try {
    return decodeURIComponent(value) || null;
  } catch {
    return null;
  }
}

function serializeGuestCookie(guestId: string): string {
  return [
    `${GUEST_SESSION_COOKIE}=${encodeURIComponent(guestId)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${GUEST_SESSION_COOKIE_MAX_AGE_SECONDS}`
  ].join('; ');
}
