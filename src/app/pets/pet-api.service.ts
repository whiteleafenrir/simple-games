import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom, Observable, timeout } from 'rxjs';
import type { ApplyCareActionRequest, CreatePetRequest, GuestSession } from '@simple-games/pet-contract';
import type { AnswerQuestionRequest, PetQuestionHistoryPage, PetQuestionResponse, QuestionLanguage, StartQuestionRequest } from '@simple-games/pet-contract';

import { PetOption, SessionLength } from '../pocket-pet/pocket-pet.model';
import { OwnedPet, PetCareActionId, PetCareActionResult, PetHistoryPage } from './owned-pet.model';

const API_BASE_URL = '/api';
const REQUEST_OPTIONS = { withCredentials: true } as const;

@Injectable({
  providedIn: 'root'
})
export class PetApiService {
  private readonly http = inject(HttpClient);

  private request<T>(request: Observable<T>): Promise<T> {
    return firstValueFrom(request.pipe(timeout(20_000)));
  }

  createOrGetGuestSession(): Promise<GuestSession> {
    return this.request(this.http.post<GuestSession>(`${API_BASE_URL}/guest-sessions`, {}, REQUEST_OPTIONS));
  }

  getPets(guestId: string): Promise<OwnedPet[]> {
    return this.request(this.http.get<OwnedPet[]>(
      `${API_BASE_URL}/guest-sessions/${encodeURIComponent(guestId)}/pets`,
      REQUEST_OPTIONS
    ));
  }

  createPet(guestId: string, pet: PetOption, sessionLength: SessionLength, name: string): Promise<OwnedPet> {
    return this.request(this.http.post<OwnedPet>(`${API_BASE_URL}/guest-sessions/${encodeURIComponent(guestId)}/pets`, {
      name,
      petId: pet.id,
      sessionLengthId: sessionLength.id
    } satisfies CreatePetRequest, REQUEST_OPTIONS));
  }

  getPet(guestId: string, petId: string): Promise<OwnedPet> {
    return this.request(this.http.get<OwnedPet>(
      `${API_BASE_URL}/guest-sessions/${encodeURIComponent(guestId)}/pets/${encodeURIComponent(petId)}`,
      REQUEST_OPTIONS
    ));
  }

  applyCareAction(guestId: string, petId: string, actionId: PetCareActionId): Promise<PetCareActionResult> {
    return this.request(this.http.post<PetCareActionResult>(
      `${API_BASE_URL}/guest-sessions/${encodeURIComponent(guestId)}/pets/${encodeURIComponent(petId)}/actions`,
      { actionId } satisfies ApplyCareActionRequest,
      REQUEST_OPTIONS
    ));
  }

  getHistory(guestId: string, petId: string, cursor: string | null): Promise<PetHistoryPage> {
    return this.request(this.http.get<PetHistoryPage>(
      `${API_BASE_URL}/guest-sessions/${encodeURIComponent(guestId)}/pets/${encodeURIComponent(petId)}/history`,
      { ...REQUEST_OPTIONS, params: cursor ? { cursor } : {} }
    ));
  }

  startQuestion(guestId: string, petId: string, language: QuestionLanguage): Promise<PetQuestionResponse> {
    return this.request(this.http.post<PetQuestionResponse>(this.questionsUrl(guestId, petId),
      { language } satisfies StartQuestionRequest, REQUEST_OPTIONS));
  }

  answerQuestion(guestId: string, petId: string, attemptId: string, optionId: string | null): Promise<PetQuestionResponse> {
    return this.request(this.http.post<PetQuestionResponse>(`${this.questionsUrl(guestId, petId)}/${encodeURIComponent(attemptId)}/answer`,
      { optionId } satisfies AnswerQuestionRequest, REQUEST_OPTIONS));
  }

  getQuestionHistory(guestId: string, petId: string, cursor: string | null): Promise<PetQuestionHistoryPage> {
    return this.request(this.http.get<PetQuestionHistoryPage>(`${this.questionsUrl(guestId, petId)}/history`,
      { ...REQUEST_OPTIONS, params: cursor ? { cursor } : {} }));
  }

  private questionsUrl(guestId: string, petId: string): string {
    return `${API_BASE_URL}/guest-sessions/${encodeURIComponent(guestId)}/pets/${encodeURIComponent(petId)}/questions`;
  }
}
