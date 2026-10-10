import { Body, Controller, Delete, Get, Header, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse
} from '@nestjs/swagger';
import type { TelegramLinkCode, TelegramLinkStatus } from '@simple-games/pet-contract';

import { GuestSessionGuard } from './guest-session.guard';
import { parseRequestBody } from './request-body';
import { TelegramLinkService } from './telegram-link.service';

@ApiTags('Уведомления Telegram')
@ApiCookieAuth('guest-session')
@ApiParam({ name: 'guestId', schema: { type: 'string', format: 'uuid' } })
@ApiUnauthorizedResponse({ description: 'Нет действующей гостевой cookie.' })
@ApiForbiddenResponse({ description: 'Гостевая сессия принадлежит другому браузеру.' })
@UseGuards(GuestSessionGuard)
@Controller('guest-sessions/:guestId/telegram')
export class TelegramLinkController {
  constructor(private readonly service: TelegramLinkService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Получить доступность подключения Telegram и срок выданного кода' })
  status(@Param('guestId') guestId: string): Promise<TelegramLinkStatus> {
    return this.service.status(guestId);
  }

  @Post('link-code')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Выдать одноразовый код на 10 минут; прежний код перестаёт действовать' })
  @ApiBody({ schema: { type: 'object', additionalProperties: false, example: {} } })
  @ApiBadRequestResponse({ description: 'Ожидается пустой JSON-объект.' })
  createCode(@Param('guestId') guestId: string, @Body() body: unknown): Promise<TelegramLinkCode> {
    parseRequestBody(body, []);
    return this.service.createCode(guestId);
  }

  @Delete('link-code')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Отозвать выданный код; повторный отзыв допустим' })
  revokeCode(@Param('guestId') guestId: string): Promise<TelegramLinkStatus> {
    return this.service.revokeCode(guestId);
  }
}
