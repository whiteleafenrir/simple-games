import { BadRequestException, Injectable } from '@nestjs/common';
import { Chess } from 'chess.js';
import type { ChessDifficulty, ChessPuzzleResponse } from '@simple-games/pet-contract';
import { ChessPuzzleRepository } from './chess-puzzle.repository';

@Injectable()
export class ChessPuzzleService {
  constructor(private readonly repository: ChessPuzzleRepository) {}

  async random(difficulty: unknown, previousId: unknown): Promise<ChessPuzzleResponse> {
    const level = difficulty ?? 'easy';
    if (level !== 'easy' && level !== 'medium' && level !== 'hard') {
      throw new BadRequestException('difficulty must be easy, medium or hard.');
    }
    if (previousId !== undefined && (typeof previousId !== 'string' || !/^[a-zA-Z0-9]{5}$/.test(previousId))) {
      throw new BadRequestException('previousId must be a Lichess puzzle id.');
    }
    const record = await this.repository.random(level satisfies ChessDifficulty, previousId as string | undefined);
    if (!record) return { puzzle: null };
    const chess = new Chess(record.fen);
    chess.move(record.moves[0]);
    return {
      puzzle: {
        id: record.id,
        fen: chess.fen(),
        solution: record.moves.slice(1),
        rating: record.rating,
        themes: record.themes,
        sourceUrl: `https://lichess.org/training/${record.id}`
      }
    };
  }
}
