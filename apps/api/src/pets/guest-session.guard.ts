import { CanActivate, ExecutionContext, ForbiddenException, Injectable, ParseUUIDPipe, UnauthorizedException } from '@nestjs/common';

import { GuestSessionAuthService } from './guest-session-auth.service';

@Injectable()
export class GuestSessionGuard implements CanActivate {
  private readonly uuidPipe = new ParseUUIDPipe({ version: '4' });

  constructor(private readonly auth: GuestSessionAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: { cookie?: string };
      params: { guestId: string };
    }>();
    const session = await this.auth.authenticate(request.headers.cookie);
    if (!session) {
      throw new UnauthorizedException('A valid guest session cookie is required.');
    }

    const guestId = await this.uuidPipe.transform(request.params.guestId, { type: 'param', data: 'guestId' });
    if (guestId !== session.id) {
      throw new ForbiddenException('Guest session does not belong to this browser.');
    }
    return true;
  }
}
