import { Module } from '@nestjs/common';

import { PrismaModule } from './prisma/prisma.module';
import { PetsModule } from './pets/pets.module';

@Module({
  imports: [
    PrismaModule,
    PetsModule
  ]
})
export class AppModule {}
