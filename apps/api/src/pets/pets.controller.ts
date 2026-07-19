import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { ApplyCareActionRequest, CreatePetRequest, OwnedPet, PetCareActionResult } from './pet-domain.types';
import { PocketPetService } from './pocket-pet.service';

@Controller('guest-sessions/:guestId/pets')
export class PetsController {
  constructor(private readonly pocketPetService: PocketPetService) {}

  @Get()
  listPets(@Param('guestId') guestId: string): Promise<OwnedPet[]> {
    return this.pocketPetService.listPets(guestId);
  }

  @Post()
  createPet(
    @Param('guestId') guestId: string,
    @Body() request: CreatePetRequest
  ): Promise<OwnedPet> {
    return this.pocketPetService.createPet(guestId, request);
  }

  @Get(':petId')
  getPet(
    @Param('guestId') guestId: string,
    @Param('petId') petId: string
  ): Promise<OwnedPet> {
    return this.pocketPetService.getPet(guestId, petId);
  }

  @Post(':petId/actions')
  applyCareAction(
    @Param('guestId') guestId: string,
    @Param('petId') petId: string,
    @Body() request: ApplyCareActionRequest
  ): Promise<PetCareActionResult> {
    return this.pocketPetService.applyCareAction(guestId, petId, request);
  }
}
