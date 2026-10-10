import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { TelegramLinkCode, TelegramLinkStatus } from '@simple-games/pet-contract';
import { firstValueFrom, timeout } from 'rxjs';

import { PetStorageService } from '../pets/pet-storage.service';

@Injectable({ providedIn: 'root' })
export class TelegramLinkApiService {
  private readonly http = inject(HttpClient);
  private readonly pets = inject(PetStorageService);

  async status(): Promise<TelegramLinkStatus> {
    return firstValueFrom(
      this.http.get<TelegramLinkStatus>(await this.url(), { withCredentials: true }).pipe(timeout(20_000))
    );
  }

  async createCode(): Promise<TelegramLinkCode> {
    return firstValueFrom(
      this.http
        .post<TelegramLinkCode>(`${await this.url()}/link-code`, {}, { withCredentials: true })
        .pipe(timeout(20_000))
    );
  }

  async revokeCode(): Promise<TelegramLinkStatus> {
    return firstValueFrom(
      this.http
        .delete<TelegramLinkStatus>(`${await this.url()}/link-code`, { withCredentials: true })
        .pipe(timeout(20_000))
    );
  }

  private async url(): Promise<string> {
    await this.pets.ready();
    if (!this.pets.guestId()) await this.pets.resolvePets();
    const guestId = this.pets.guestId();
    if (!guestId) throw new Error('Guest session unavailable.');
    return `/api/guest-sessions/${encodeURIComponent(guestId)}/telegram`;
  }
}
