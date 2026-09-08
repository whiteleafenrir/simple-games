import { Body, Controller, Get, Header, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBody, ApiCookieAuth, ApiForbiddenResponse, ApiOperation, ApiParam, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { PET_CARE_ACTION_IDS } from './pet-engine';

import { GuestSessionGuard } from './guest-session.guard';
import { OwnedPet, PetCareActionResult } from './pet-domain.types';
import { PocketPetService } from './pocket-pet.service';

@ApiTags('Питомцы')
@ApiCookieAuth('guest-session')
@ApiParam({ name: 'guestId', schema: { type: 'string', format: 'uuid' }, description: 'UUID v4 своей гостевой сессии.' })
@ApiBadRequestResponse({ description: 'Некорректное тело запроса или UUID v4 в URL.' })
@ApiUnauthorizedResponse({ description: 'Нет действующей гостевой cookie.' })
@ApiForbiddenResponse({ description: 'guestId не принадлежит текущей cookie.' })
@UseGuards(GuestSessionGuard)
@Controller('guest-sessions/:guestId/pets')
export class PetsController {
  constructor(private readonly pocketPetService: PocketPetService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Посмотреть питомцев гостя', description: 'Актуализирует и сохраняет состояние с учётом прошедшего времени.' })
  listPets(@Param('guestId') guestId: string): Promise<OwnedPet[]> {
    return this.pocketPetService.listPets(guestId);
  }

  @Post()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Создать питомца', description: 'У гостя может быть только один активный питомец. short — 1 день, standard — 3 дня, long — 7 дней.' })
  @ApiBody({ schema: {
    type: 'object', additionalProperties: false, required: ['name', 'petId', 'sessionLengthId'],
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 32, example: 'Искорка' },
      petId: { type: 'string', enum: ['cat', 'dog', 'parrot', 'dinosaur'], example: 'cat' },
      sessionLengthId: { type: 'string', enum: ['short', 'standard', 'long'], example: 'short' }
    }
  } })
  createPet(
    @Param('guestId') guestId: string,
    @Body() request: unknown
  ): Promise<OwnedPet> {
    return this.pocketPetService.createPet(guestId, request);
  }

  @Get(':petId')
  @Header('Cache-Control', 'no-store')
  @ApiParam({ name: 'petId', schema: { type: 'string', format: 'uuid' }, description: 'UUID v4 созданного питомца.' })
  @ApiOperation({ summary: 'Посмотреть питомца по id', description: 'Актуализирует и сохраняет состояние по серверному времени. petId в URL — UUID созданного питомца, а не название вида.' })
  getPet(
    @Param('guestId') guestId: string,
    @Param('petId', new ParseUUIDPipe({ version: '4' })) petId: string
  ): Promise<OwnedPet> {
    return this.pocketPetService.getPet(guestId, petId);
  }

  @Post(':petId/actions')
  @Header('Cache-Control', 'no-store')
  @ApiParam({ name: 'petId', schema: { type: 'string', format: 'uuid' }, description: 'UUID v4 созданного питомца.' })
  @ApiOperation({ summary: 'Выполнить действие заботы', description: 'applied=true — действие выполнено. applied=false и reason — игровое ограничение, например cooldown или sleeping.' })
  @ApiBody({ schema: {
    type: 'object', additionalProperties: false, required: ['actionId'],
    properties: { actionId: { type: 'string', enum: [...PET_CARE_ACTION_IDS], example: 'feed' } }
  } })
  applyCareAction(
    @Param('guestId') guestId: string,
    @Param('petId', new ParseUUIDPipe({ version: '4' })) petId: string,
    @Body() request: unknown
  ): Promise<PetCareActionResult> {
    return this.pocketPetService.applyCareAction(guestId, petId, request);
  }
}
