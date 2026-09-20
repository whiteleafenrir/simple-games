import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { GuestSessionsController } from './guest-sessions.controller';
import { GuestSessionAuthService } from './guest-session-auth.service';
import { GuestSessionGuard } from './guest-session.guard';
import { PetsController } from './pets.controller';
import { POCKET_PET_REPOSITORY } from './pocket-pet.repository';
import { PocketPetService } from './pocket-pet.service';
import { PrismaPocketPetRepository } from './prisma-pocket-pet.repository';
import { PetQuestionService } from './pet-question.service';
import { PetQuestionsController } from './pet-questions.controller';

@Module({
  imports: [
    PrismaModule
  ],
  controllers: [
    GuestSessionsController,
    PetsController,
    PetQuestionsController
  ],
  providers: [
    PocketPetService,
    PetQuestionService,
    GuestSessionAuthService,
    GuestSessionGuard,
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
