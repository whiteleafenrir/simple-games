import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TelegramLinkRepository {
  constructor(private readonly prisma: PrismaService) {}

  find(guestSessionId: string) {
    return this.prisma.telegramLinkCode.findUnique({ where: { guestSessionId } });
  }

  async replace(guestSessionId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    // A native upsert keeps one current code even when several tabs issue codes at once.
    await this.prisma.telegramLinkCode.upsert({
      where: { guestSessionId },
      create: { guestSessionId, tokenHash, expiresAt },
      update: { tokenHash, expiresAt }
    });
  }

  async revoke(guestSessionId: string): Promise<void> {
    await this.prisma.telegramLinkCode.deleteMany({ where: { guestSessionId } });
  }
}
