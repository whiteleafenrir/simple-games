import { Controller, Get, Header, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { ChessPuzzleResponse } from '@simple-games/pet-contract';
import { ChessPuzzleService } from './chess-puzzle.service';

@ApiTags('Шахматные задачи')
@Controller('chess/puzzles')
export class ChessPuzzleController {
  constructor(private readonly puzzles: ChessPuzzleService) {}

  @Get('random')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Случайная задача Lichess из БД',
    description:
      'Публичный каталог, без cookie и изменений питомца. FEN уже включает первый ход соперника; solution начинается ходом игрока. Предыдущая задача исключается, если в уровне есть другая.'
  })
  @ApiQuery({
    name: 'difficulty',
    required: false,
    enum: ['easy', 'medium', 'hard'],
    description: 'Рейтинг <1200, 1200–1799 или ≥1800; по умолчанию easy.'
  })
  @ApiQuery({
    name: 'previousId',
    required: false,
    type: String,
    description: 'Пятисимвольный id предыдущей задачи Lichess.'
  })
  @ApiOkResponse({
    description:
      '{ puzzle: { id, fen, solution: string[] (UCI), rating, themes: string[], sourceUrl } }; puzzle: null при пустом уровне.'
  })
  @ApiBadRequestResponse({ description: 'Некорректный уровень или id задачи.' })
  random(
    @Query('difficulty') difficulty: unknown,
    @Query('previousId') previousId: unknown
  ): Promise<ChessPuzzleResponse> {
    return this.puzzles.random(difficulty, previousId);
  }
}
