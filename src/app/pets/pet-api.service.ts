import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { PetOption, SessionLength } from '../pocket-pet/pocket-pet.model';
import { OwnedPet, PetCareActionId, PetCareActionResult } from './owned-pet.model';

const API_BASE_URL = '/api';
const REQUEST_OPTIONS = { withCredentials: true } as const;

export interface GuestSessionDto {
  id: string;
  createdAt: string;
  lastSeenAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class PetApiService {
  private readonly http = inject(HttpClient);

  createOrGetGuestSession(): Promise<GuestSessionDto> {
    return firstValueFrom(this.http.post<GuestSessionDto>(`${API_BASE_URL}/guest-sessions`, {}, REQUEST_OPTIONS));
  }

  getPets(guestId: string): Promise<OwnedPet[]> {
    return firstValueFrom(this.http.get<OwnedPet[]>(
      `${API_BASE_URL}/guest-sessions/${encodeURIComponent(guestId)}/pets`,
      REQUEST_OPTIONS
    ));
  }

  createPet(guestId: string, pet: PetOption, sessionLength: SessionLength, name: string): Promise<OwnedPet> {
    return firstValueFrom(this.http.post<OwnedPet>(`${API_BASE_URL}/guest-sessions/${encodeURIComponent(guestId)}/pets`, {
      name,
      petId: pet.id,
      sessionLengthId: sessionLength.id
    }, REQUEST_OPTIONS));
  }

  getPet(guestId: string, petId: string): Promise<OwnedPet> {
    return firstValueFrom(this.http.get<OwnedPet>(
      `${API_BASE_URL}/guest-sessions/${encodeURIComponent(guestId)}/pets/${encodeURIComponent(petId)}`,
      REQUEST_OPTIONS
    ));
  }

  applyCareAction(guestId: string, petId: string, actionId: PetCareActionId): Promise<PetCareActionResult> {
    return firstValueFrom(this.http.post<PetCareActionResult>(
      `${API_BASE_URL}/guest-sessions/${encodeURIComponent(guestId)}/pets/${encodeURIComponent(petId)}/actions`,
      { actionId },
      REQUEST_OPTIONS
    ));
  }
}
