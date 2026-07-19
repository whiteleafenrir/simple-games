import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { GuestSession } from './pet-domain.types';
import { PocketPetService } from './pocket-pet.service';

interface GuestSessionRequest {
  guestId?: unknown;
}

@Controller('guest-sessions')
export class GuestSessionsController {
  constructor(private readonly pocketPetService: PocketPetService) {}

  @Post()
  createOrGetGuestSession(@Body() request: GuestSessionRequest | undefined): Promise<GuestSession> {
    return this.pocketPetService.createOrGetGuestSession(request?.guestId);
  }

  @Get(':guestId')
  getGuestSession(@Param('guestId') guestId: string): Promise<GuestSession> {
    return this.pocketPetService.getGuestSession(guestId);
  }
}
