import { Module } from '@nestjs/common';
import { ChessPuzzleController } from './chess-puzzle.controller';
import { ChessPuzzleRepository } from './chess-puzzle.repository';
import { ChessPuzzleService } from './chess-puzzle.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ChessPuzzleController],
  providers: [ChessPuzzleRepository, ChessPuzzleService]
})
export class ChessModule {}
