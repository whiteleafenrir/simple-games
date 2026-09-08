import { Body, Controller, Get, Header, Headers, Param, Post, Res, UseGuards } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBody, ApiCookieAuth, ApiForbiddenResponse, ApiOperation, ApiParam, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

import { GuestSessionAuthService } from './guest-session-auth.service';
import { GuestSessionGuard } from './guest-session.guard';
import { GuestSession } from './pet-domain.types';
import { PocketPetService } from './pocket-pet.service';
import { parseRequestBody } from './request-body';

interface GuestSessionResponse {
  setHeader(name: string, value: string): void;
}

@ApiTags('Гостевая сессия')
@Controller('guest-sessions')
export class GuestSessionsController {
  constructor(
    private readonly pocketPetService: PocketPetService,
    private readonly auth: GuestSessionAuthService
  ) {}

  @Post()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Начать или восстановить сессию', description: 'Отправьте {} или пустое тело. Секретная cookie устанавливается автоматически; публичный id из ответа нужен для guestId в остальных методах. Передавать guestId в body нельзя.' })
  @ApiBody({ required: false, schema: { type: 'object', additionalProperties: false, example: {} } })
  @ApiBadRequestResponse({ description: 'Ожидается пустой JSON-объект или отсутствие тела.' })
  async createOrGetGuestSession(
    @Body() request: unknown,
    @Headers('cookie') cookieHeader: string | undefined,
    @Res({ passthrough: true }) response?: GuestSessionResponse
  ): Promise<GuestSession> {
    parseRequestBody(request === undefined ? {} : request, []);
    const { session, cookie } = await this.auth.createOrRestore(cookieHeader);
    response?.setHeader('Set-Cookie', cookie);
    return session;
  }

  @Get(':guestId')
  @UseGuards(GuestSessionGuard)
  @Header('Cache-Control', 'no-store')
  @ApiCookieAuth('guest-session')
  @ApiParam({ name: 'guestId', schema: { type: 'string', format: 'uuid' }, description: 'UUID v4 своей гостевой сессии.' })
  @ApiBadRequestResponse({ description: 'guestId должен быть UUID v4.' })
  @ApiUnauthorizedResponse({ description: 'Нет действующей гостевой cookie.' })
  @ApiForbiddenResponse({ description: 'guestId не принадлежит текущей cookie.' })
  @ApiOperation({ summary: 'Посмотреть сессию (обновляет lastSeenAt)' })
  getGuestSession(@Param('guestId') guestId: string): Promise<GuestSession> {
    return this.pocketPetService.getGuestSession(guestId);
  }
}
