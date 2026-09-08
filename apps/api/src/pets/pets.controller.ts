import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PET_CARE_ACTION_IDS } from './pet-engine';

import { ApplyCareActionRequest, CreatePetRequest, OwnedPet, PetCareActionResult } from './pet-domain.types';
import { PocketPetService } from './pocket-pet.service';

@ApiTags('Питомцы')
@Controller('guest-sessions/:guestId/pets')
export class PetsController {
  constructor(private readonly pocketPetService: PocketPetService) {}

  @Get()
  @ApiOperation({ summary: 'Посмотреть питомцев гостя', description: 'Актуализирует и сохраняет состояние с учётом прошедшего времени.' })
  listPets(@Param('guestId') guestId: string): Promise<OwnedPet[]> {
    return this.pocketPetService.listPets(guestId);
  }

  @Post()
  @ApiOperation({ summary: 'Создать питомца', description: 'У гостя может быть только один активный питомец. short — 1 день, standard — 3 дня, long — 7 дней.' })
  @ApiBody({ schema: {
    type: 'object', required: ['name', 'petId', 'sessionLengthId'],
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 32, example: 'Искорка' },
      petId: { type: 'string', enum: ['cat', 'dog', 'parrot', 'dinosaur'], example: 'cat' },
      sessionLengthId: { type: 'string', enum: ['short', 'standard', 'long'], example: 'short' }
    }
  } })
  createPet(
    @Param('guestId') guestId: string,
    @Body() request: CreatePetRequest
  ): Promise<OwnedPet> {
    return this.pocketPetService.createPet(guestId, request);
  }

  @Get(':petId')
  @ApiOperation({ summary: 'Посмотреть питомца по id', description: 'Актуализирует и сохраняет состояние по серверному времени. petId в URL — UUID созданного питомца, а не название вида.' })
  getPet(
    @Param('guestId') guestId: string,
    @Param('petId') petId: string
  ): Promise<OwnedPet> {
    return this.pocketPetService.getPet(guestId, petId);
  }

  @Post(':petId/actions')
  @ApiOperation({ summary: 'Выполнить действие заботы', description: 'applied=true — действие выполнено. applied=false и reason — игровое ограничение, например cooldown или sleeping.' })
  @ApiBody({ schema: {
    type: 'object', required: ['actionId'],
    properties: { actionId: { type: 'string', enum: [...PET_CARE_ACTION_IDS], example: 'feed' } }
  } })
  applyCareAction(
    @Param('guestId') guestId: string,
    @Param('petId') petId: string,
    @Body() request: ApplyCareActionRequest
  ): Promise<PetCareActionResult> {
    return this.pocketPetService.applyCareAction(guestId, petId, request);
  }
}
