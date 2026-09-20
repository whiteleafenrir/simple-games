import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomInt, randomUUID } from 'node:crypto';
import { AnswerQuestionRequest, OwnedPet, PetQuestionHistoryPage, PetQuestionResponse, StartQuestionRequest } from './pet-domain.types';
import { resolvePetState } from './pet-engine';
import { parseHistoryCursor } from './pet-history';
import { publicQuestion, questionResult, StoredQuestionAttempt } from './pet-question-attempt';
import { petSnapshot } from './pet-snapshot';
import { QUESTION_CATALOG } from './pet-question-catalog';
import { questionFailureReason, questionReadyAt, resolveQuestionOutcome } from './pet-question-rules';
import { GuestSessionNotFoundError, POCKET_PET_REPOSITORY, PocketPetRepository, PocketPetTransaction } from './pocket-pet.repository';
import { parseRequestBody } from './request-body';

const QUESTION_HISTORY_PAGE_SIZE = 20;

@Injectable()
export class PetQuestionService {
  constructor(@Inject(POCKET_PET_REPOSITORY) private readonly repository: PocketPetRepository) {}

  async start(guestId: string, petId: string, request: unknown, now?: Date): Promise<PetQuestionResponse> {
    const body = parseRequestBody(request, ['language']);
    const language = body['language'];
    if (language !== 'ru' && language !== 'en') throw new BadRequestException('Question language must be ru or en.');
    const input: StartQuestionRequest = { language };
    return this.withGuest(guestId, async tx => {
      const at = now ?? new Date();
      const pet = await this.resolvePet(tx, petId, at);
      const reason = questionFailureReason(pet);
      if (reason) return response(tx, pet, at, { reason });
      const latest = await tx.latestQuestion(petId);
      if (latest && !latest.completedAt) return response(tx, pet, at, { attempt: publicQuestion(latest) });
      if (latest?.completedAt) {
        const nextAvailableAt = questionReadyAt(latest.completedAt);
        if (Date.parse(nextAvailableAt) > at.getTime()) return response(tx, pet, at, { reason: 'cooldown', nextAvailableAt });
      }
      const pool = QUESTION_CATALOG.filter(item => item.periodOfLife === pet.periodOfLife && item.content[input.language]);
      if (pool.length === 0) return response(tx, pet, at, { reason: 'no-content' });
      const asked = new Set(await tx.askedQuestionIds(petId));
      const unseen = pool.filter(item => !asked.has(item.id));
      const different = pool.filter(item => item.id !== latest?.questionId);
      const candidates = unseen.length ? unseen : different.length ? different : pool;
      const definition = structuredClone(candidates[randomInt(candidates.length)]!);
      const optionOrder = definition.content[input.language].options.map(option => option.id);
      for (let index = optionOrder.length - 1; index > 0; index--) {
        const other = randomInt(index + 1);
        [optionOrder[index], optionOrder[other]] = [optionOrder[other]!, optionOrder[index]!];
      }
      const attempt: StoredQuestionAttempt = {
        id: randomUUID(), petId, questionId: definition.id, definition, optionOrder,
        language: input.language, issuedAt: at.toISOString(), completedAt: null, outcome: null,
        selectedOptionId: null, activityCompleted: null, happinessChange: null, trustChange: null
      };
      await tx.saveQuestion(attempt);
      return response(tx, pet, at, { attempt: publicQuestion(attempt) });
    });
  }

  async answer(guestId: string, petId: string, attemptId: string, request: unknown, now?: Date): Promise<PetQuestionResponse> {
    const body = parseRequestBody(request, ['optionId']);
    const optionId = body['optionId'];
    if (optionId !== null && (typeof optionId !== 'string' || optionId.length === 0 || optionId.length > 100)) {
      throw new BadRequestException('Choose an optionId or null to decline.');
    }
    const input: AnswerQuestionRequest = { optionId };
    return this.withGuest(guestId, async tx => {
      const at = now ?? new Date();
      const pet = await this.resolvePet(tx, petId, at);
      const attempt = await tx.getQuestion(petId, attemptId);
      if (!attempt) throw new NotFoundException('Question attempt not found.');
      if (attempt.completedAt) {
        return response(tx, pet, at, { result: questionResult(attempt), nextAvailableAt: questionReadyAt(attempt.completedAt) });
      }
      const reason = questionFailureReason(pet);
      if (reason) return response(tx, pet, at, { reason });
      if (input.optionId !== null && !attempt.optionOrder.includes(input.optionId)) {
        throw new BadRequestException('Option does not belong to this question.');
      }
      const outcome = input.optionId === null ? 'declined' : input.optionId === attempt.definition.correctOptionId ? 'correct' : 'incorrect';
      const { activityCompleted, ...state } = resolveQuestionOutcome(pet, outcome);
      const nextPet = { ...pet, ...state };
      const completed: StoredQuestionAttempt = {
        ...attempt, completedAt: at.toISOString(), selectedOptionId: input.optionId, outcome, activityCompleted,
        happinessChange: nextPet.stats.happiness - pet.stats.happiness, trustChange: nextPet.trust - pet.trust
      };
      await tx.saveQuestion(completed);
      await tx.savePet(nextPet);
      return response(tx, nextPet, at, { result: questionResult(completed), nextAvailableAt: questionReadyAt(completed.completedAt!) });
    });
  }

  async history(guestId: string, petId: string, cursorValue?: unknown): Promise<PetQuestionHistoryPage> {
    const cursor = parseHistoryCursor(cursorValue);
    return this.withGuest(guestId, async tx => {
      if (!await tx.getPet(petId)) throw new NotFoundException('Pet not found.');
      const entries = await tx.questionHistory(petId, cursor, QUESTION_HISTORY_PAGE_SIZE + 1);
      const items = entries.slice(0, QUESTION_HISTORY_PAGE_SIZE).map(questionResult);
      const last = items.at(-1);
      return {
        items, nextCursor: entries.length > QUESTION_HISTORY_PAGE_SIZE && last
          ? Buffer.from(JSON.stringify([last.completedAt, last.attempt.id])).toString('base64url') : null
      };
    });
  }

  private async resolvePet(tx: PocketPetTransaction, petId: string, at: Date): Promise<OwnedPet> {
    const pet = await tx.getPet(petId);
    if (!pet) throw new NotFoundException('Pet not found.');
    await tx.touchGuestSession(at);
    const resolved = resolvePetState(pet, at);
    return pet.status === 'pet' ? tx.savePet(resolved) : resolved;
  }

  private async withGuest<T>(guestId: string, operation: (tx: PocketPetTransaction) => Promise<T>): Promise<T> {
    try { return await this.repository.withGuestTransaction(guestId, operation); }
    catch (error) {
      if (error instanceof GuestSessionNotFoundError) throw new NotFoundException('Guest session not found.');
      throw error;
    }
  }
}

async function response(tx: PocketPetTransaction, pet: OwnedPet, at: Date, fields: Partial<Omit<PetQuestionResponse, 'pet'>>): Promise<PetQuestionResponse> {
  return { pet: await petSnapshot(tx, pet, at), attempt: null, result: null, reason: null, nextAvailableAt: null, ...fields };
}
