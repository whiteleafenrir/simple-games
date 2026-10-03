import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { ChessPuzzle } from '@prisma/client';
import type { ChessDifficulty } from '@simple-games/pet-contract';
import { randomInt } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';

const RATINGS = {
  easy: { lt: 1200 },
  medium: { gte: 1200, lt: 1800 },
  hard: { gte: 1800 }
} satisfies Record<ChessDifficulty, Prisma.IntFilter>;

@Injectable()
export class ChessPuzzleRepository {
  constructor(private readonly prisma: PrismaService) {}

  random(difficulty: ChessDifficulty, previousId?: string): Promise<ChessPuzzle | null> {
    return this.prisma.$transaction(
      async (tx) => {
        const where: Prisma.ChessPuzzleWhereInput = {
          rating: RATINGS[difficulty],
          ...(previousId ? { id: { not: previousId } } : {})
        };
        const count = await tx.chessPuzzle.count({ where });
        if (!count) {
          return previousId
            ? tx.chessPuzzle.findFirst({ where: { rating: RATINGS[difficulty], id: previousId } })
            : null;
        }
        return tx.chessPuzzle.findFirst({ where, orderBy: [{ rating: 'asc' }, { id: 'asc' }], skip: randomInt(count) });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead }
    );
  }
}
