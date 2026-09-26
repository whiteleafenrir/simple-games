import { Body, Controller, Get, Header, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBody, ApiCookieAuth, ApiForbiddenResponse, ApiOperation, ApiParam, ApiQuery, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { PET_CARE_ACTION_IDS } from './pet-engine';
import { COAT_COLORS, COAT_PATTERNS } from './pet-appearance';
import { GuestSessionGuard } from './guest-session.guard';
import { PetSnapshot, PetCareActionResponse, PetHistoryPage } from './pet-domain.types';
import { PocketPetService } from './pocket-pet.service';

const APPEARANCE_SCHEMA = {
  type: 'object' as const, additionalProperties: false, required: ['color', 'pattern'],
  properties: {
    color: { type: 'string' as const, enum: [...COAT_COLORS] },
    pattern: { type: 'string' as const, enum: [...COAT_PATTERNS] }
  }
};


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
  @ApiOperation({ summary: 'Посмотреть питомцев гостя', description: 'Текущие snapshots с careHistoryCount и отдельным trust (0–100), без массива истории. Поле actions содержит серверную доступность ухода/вопросов, причины, стоимость и cooldown; не сохраняется в БД. Сохраняет изменения активного питомца с учётом прошедшего времени.' })
  listPets(@Param('guestId') guestId: string): Promise<PetSnapshot[]> {
    return this.pocketPetService.listPets(guestId);
  }

  @Post()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Создать питомца', description: 'У гостя может быть только один активный питомец. short — 1 день, standard — 3 дня, long — 7 дней. Доверие trust задаётся сервером: начальное значение 50.' })
  @ApiBody({ schema: {
    type: 'object', additionalProperties: false, required: ['name', 'petId', 'sessionLengthId'],
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 32, example: 'Искорка' },
      appearance: APPEARANCE_SCHEMA,
      petId: { type: 'string', enum: ['cat', 'dog', 'parrot', 'dinosaur'], example: 'cat' },
      sessionLengthId: { type: 'string', enum: ['short', 'standard', 'long'], example: 'short' }
    }
  } })
  createPet(
    @Param('guestId') guestId: string,
    @Body() request: unknown
  ): Promise<PetSnapshot> {
    return this.pocketPetService.createPet(guestId, request);
  }

  @Get(':petId')
  @Header('Cache-Control', 'no-store')
  @ApiParam({ name: 'petId', schema: { type: 'string', format: 'uuid' }, description: 'UUID v4 созданного питомца.' })
  @ApiOperation({ summary: 'Посмотреть питомца по id', description: 'Актуализирует и сохраняет состояние по серверному времени. Snapshot включает отдельное доверие trust (0–100), не входящее в care score. petId в URL — UUID созданного питомца, а не название вида.' })
  getPet(
    @Param('guestId') guestId: string,
    @Param('petId', new ParseUUIDPipe({ version: '4' })) petId: string
  ): Promise<PetSnapshot> {
    return this.pocketPetService.getPet(guestId, petId);
  }

  @Patch(':petId/appearance')
  @Header('Cache-Control', 'no-store')
  @ApiParam({ name: 'petId', schema: { type: 'string', format: 'uuid' } })
  @ApiOperation({ summary: 'Изменить внешность', description: 'Только свой активный питомец. Возвращает snapshot с appearance. Бесплатно, без события ухода. Завершённый питомец — 409, чужой — 404.' })
  @ApiBody({ schema: APPEARANCE_SCHEMA })
  updateAppearance(
    @Param('guestId') guestId: string,
    @Param('petId', new ParseUUIDPipe({ version: '4' })) petId: string,
    @Body() request: unknown
  ): Promise<PetSnapshot> {
    return this.pocketPetService.updateAppearance(guestId, petId, request);
  }

  @Get(':petId/history')
  @Header('Cache-Control', 'no-store')
  @ApiParam({ name: 'petId', schema: { type: 'string', format: 'uuid' } })
  @ApiQuery({ name: 'cursor', required: false, type: String, description: 'nextCursor предыдущей страницы; первая страница без параметра.' })
  @ApiOperation({ summary: 'История заботы', description: 'Ответ { items, nextCursor }: до 50 событий, новые первыми, порядок appliedAt/id. История не изменяет состояние питомца. Чужой питомец — 404, неверный курсор — 400.' })
  getHistory(
    @Param('guestId') guestId: string,
    @Param('petId', new ParseUUIDPipe({ version: '4' })) petId: string,
    @Query('cursor') cursor: unknown
  ): Promise<PetHistoryPage> {
    return this.pocketPetService.getHistory(guestId, petId, cursor);
  }

  @Post(':petId/actions')
  @Header('Cache-Control', 'no-store')
  @ApiParam({ name: 'petId', schema: { type: 'string', format: 'uuid' }, description: 'UUID v4 созданного питомца.' })
  @ApiOperation({ summary: 'Выполнить действие заботы', description: 'applied=true — действие выполнено, historyEntry содержит новое событие. applied=false и reason — игровое ограничение, historyEntry=null. pet — snapshot с careHistoryCount, без массива истории.' })
  @ApiBody({ schema: {
    type: 'object', additionalProperties: false, required: ['actionId'],
    properties: { actionId: { type: 'string', enum: [...PET_CARE_ACTION_IDS], example: 'feed' } }
  } })
  applyCareAction(
    @Param('guestId') guestId: string,
    @Param('petId', new ParseUUIDPipe({ version: '4' })) petId: string,
    @Body() request: unknown
  ): Promise<PetCareActionResponse> {
    return this.pocketPetService.applyCareAction(guestId, petId, request);
  }
}
