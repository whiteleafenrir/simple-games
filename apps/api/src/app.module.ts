import { Module } from '@nestjs/common';

import { PrismaModule } from './prisma/prisma.module';
import { PetsModule } from './pets/pets.module';
import { HealthController } from './health.controller';
import { ChessModule } from './chess/chess.module';

@Module({
  controllers: [HealthController],
  imports: [PrismaModule, ChessModule, PetsModule]
})
export class AppModule {}
