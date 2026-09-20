import { Body, Controller, Get, Header, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBody, ApiCookieAuth, ApiForbiddenResponse, ApiOperation, ApiParam, ApiQuery, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { GuestSessionGuard } from './guest-session.guard';
import { PetQuestionService } from './pet-question.service';

@ApiTags('Вопросы питомца')
@ApiCookieAuth('guest-session')
@ApiParam({ name: 'guestId', schema: { type: 'string', format: 'uuid' } })
@ApiParam({ name: 'petId', schema: { type: 'string', format: 'uuid' } })
@ApiBadRequestResponse({ description: 'Некорректное тело, вариант, язык, курсор или UUID v4.' })
@ApiUnauthorizedResponse({ description: 'Нет действующей гостевой cookie.' })
@ApiForbiddenResponse({ description: 'guestId не принадлежит текущей cookie.' })
@UseGuards(GuestSessionGuard)
@Controller('guest-sessions/:guestId/pets/:petId/questions')
export class PetQuestionsController {
  constructor(private readonly questions: PetQuestionService) {}

  @Post()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Открыть вопрос', description: 'Возвращает ту же незавершённую попытку или выдаёт новую по возрасту. Ответ { pet, attempt, result, reason, nextAvailableAt }. attempt содержит RU/EN без правильного ответа. reason: inactive, sleeping, away, cooldown, no-content. Чужой питомец — 404.' })
  @ApiBody({ schema: { type: 'object', additionalProperties: false, required: ['language'], properties: { language: { type: 'string', enum: ['ru', 'en'] } } } })
  start(@Param('guestId') guestId: string, @Param('petId', new ParseUUIDPipe({ version: '4' })) petId: string, @Body() request: unknown) {
    return this.questions.start(guestId, petId, request);
  }

  @Post(':attemptId/answer')
  @Header('Cache-Control', 'no-store')
  @ApiParam({ name: 'attemptId', schema: { type: 'string', format: 'uuid' } })
  @ApiOperation({ summary: 'Ответить или отказаться', description: 'optionId=null — явный отказ. Первый исход сохраняется атомарно, повтор возвращает прежний result с актуальным pet. result содержит исход, зачёт участия, фактические дельты, правильный ответ и объяснение RU/EN. Сон/прогулка/конец сессии блокируют новый исход без штрафа.' })
  @ApiBody({ schema: { type: 'object', additionalProperties: false, required: ['optionId'], properties: { optionId: { type: 'string', nullable: true, example: 'option-1' } } } })
  answer(@Param('guestId') guestId: string, @Param('petId', new ParseUUIDPipe({ version: '4' })) petId: string,
    @Param('attemptId', new ParseUUIDPipe({ version: '4' })) attemptId: string, @Body() request: unknown) {
    return this.questions.answer(guestId, petId, attemptId, request);
  }

  @Get('history')
  @Header('Cache-Control', 'no-store')
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiOperation({ summary: 'История вопросов', description: '{ items, nextCursor }: до 20 завершённых попыток, новые первыми. Незавершённый вопрос и его правильный ответ не раскрываются.' })
  history(@Param('guestId') guestId: string, @Param('petId', new ParseUUIDPipe({ version: '4' })) petId: string, @Query('cursor') cursor: unknown) {
    return this.questions.history(guestId, petId, cursor);
  }
}
