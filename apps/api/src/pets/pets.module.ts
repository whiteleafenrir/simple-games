import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { GuestSessionsController } from './guest-sessions.controller';
import { PetsController } from './pets.controller';
import { POCKET_PET_REPOSITORY } from './pocket-pet.repository';
import { PocketPetService } from './pocket-pet.service';
import { PrismaPocketPetRepository } from './prisma-pocket-pet.repository';

@Module({
  imports: [
    PrismaModule
  ],
  controllers: [
    GuestSessionsController,
    PetsController
  ],
  providers: [
    PocketPetService,
    {
      provide: POCKET_PET_REPOSITORY,
      useClass: PrismaPocketPetRepository
    }
  ],
  exports: [
    PocketPetService
  ]
})
export class PetsModule {}
