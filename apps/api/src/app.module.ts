import { Module } from '@nestjs/common';

import { PrismaModule } from './prisma/prisma.module';
import { PetsModule } from './pets/pets.module';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController],
  imports: [
    PrismaModule,
    PetsModule
  ]
})
export class AppModule {}
