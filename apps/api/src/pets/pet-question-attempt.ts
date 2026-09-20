import { PetQuestionAttempt as AttemptRecord } from '@prisma/client';
import { PetQuestionAttempt, PetQuestionResult, QuestionLanguage, QuestionOutcome } from './pet-domain.types';
import { QuestionDefinition } from './pet-question-catalog';
import { PetDataIntegrityError } from './pet-record.mapper';

export interface StoredQuestionAttempt {
  id: string;
  petId: string;
  questionId: string;
  definition: QuestionDefinition;
  optionOrder: string[];
  language: QuestionLanguage;
  issuedAt: string;
  completedAt: string | null;
  outcome: QuestionOutcome | null;
  selectedOptionId: string | null;
  activityCompleted: boolean | null;
  happinessChange: number | null;
  trustChange: number | null;
}

export function publicQuestion(attempt: StoredQuestionAttempt): PetQuestionAttempt {
  const content = (language: QuestionLanguage) => ({
    prompt: attempt.definition.content[language].prompt,
    options: attempt.optionOrder.map(id => ({ ...attempt.definition.content[language].options.find(option => option.id === id)! }))
  });
  return {
    id: attempt.id, questionId: attempt.questionId, version: attempt.definition.version,
    periodOfLife: attempt.definition.periodOfLife, language: attempt.language, issuedAt: attempt.issuedAt,
    content: { ru: content('ru'), en: content('en') }
  };
}

export function questionResult(attempt: StoredQuestionAttempt): PetQuestionResult {
  if (!attempt.completedAt || !attempt.outcome || attempt.activityCompleted === null ||
    attempt.happinessChange === null || attempt.trustChange === null) {
    throw new PetDataIntegrityError('question.result');
  }
  return {
    attempt: publicQuestion(attempt), completedAt: attempt.completedAt, outcome: attempt.outcome,
    selectedOptionId: attempt.selectedOptionId, correctOptionId: attempt.definition.correctOptionId,
    activityCompleted: attempt.activityCompleted, happinessChange: attempt.happinessChange, trustChange: attempt.trustChange,
    explanation: { ru: attempt.definition.content.ru.explanation, en: attempt.definition.content.en.explanation }
  };
}

export function toStoredQuestion(record: AttemptRecord): StoredQuestionAttempt {
  const definition = parseDefinition(record.definition);
  if (record.questionId !== definition.id || !['ru', 'en'].includes(record.language) ||
    record.optionOrder.length !== 4 || new Set(record.optionOrder).size !== 4 ||
    !record.optionOrder.every(id => definition.content.ru.options.some(option => option.id === id)) ||
    (record.outcome !== null && !['correct', 'incorrect', 'declined'].includes(record.outcome))) {
    throw new PetDataIntegrityError('question.attempt');
  }
  const attempt: StoredQuestionAttempt = {
    ...record, definition, language: record.language as QuestionLanguage,
    outcome: record.outcome as QuestionOutcome | null,
    issuedAt: record.issuedAt.toISOString(), completedAt: record.completedAt?.toISOString() ?? null
  };
  if (attempt.completedAt) {
    questionResult(attempt);
    const declined = attempt.outcome === 'declined';
    if (attempt.completedAt < attempt.issuedAt ||
      attempt.activityCompleted !== !declined ||
      (declined ? attempt.selectedOptionId !== null : !attempt.optionOrder.includes(attempt.selectedOptionId ?? '')) ||
      (!declined && (attempt.outcome === 'correct') !== (attempt.selectedOptionId === definition.correctOptionId)) ||
      ![attempt.happinessChange, attempt.trustChange].every(value => typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= 100)) {
      throw new PetDataIntegrityError('question.result');
    }
  } else if ([attempt.outcome, attempt.selectedOptionId, attempt.activityCompleted, attempt.happinessChange, attempt.trustChange].some(value => value !== null)) {
    throw new PetDataIntegrityError('question.pending');
  }
  return attempt;
}

function parseDefinition(value: unknown): QuestionDefinition {
  const fail = (): never => { throw new PetDataIntegrityError('question.definition'); };
  const object = (item: unknown): Record<string, unknown> => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return fail();
    return item as Record<string, unknown>;
  };
  const string = (item: unknown): string => typeof item === 'string' && item.length > 0 ? item : fail();
  const definition = object(value);
  const period = definition['periodOfLife'];
  const version = definition['version'];
  if (period !== 'child' && period !== 'teen' && period !== 'adult') return fail();
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) return fail();
  const content = object(definition['content']);
  const localize = (language: QuestionLanguage) => {
    const localized = object(content[language]);
    const options = localized['options'];
    if (!Array.isArray(options) || options.length !== 4) return fail();
    return {
      prompt: string(localized['prompt']), explanation: string(localized['explanation']),
      options: options.map(item => { const option = object(item); return { id: string(option['id']), text: string(option['text']) }; })
    };
  };
  const result: QuestionDefinition = {
    id: string(definition['id']), version, periodOfLife: period,
    correctOptionId: string(definition['correctOptionId']), content: { ru: localize('ru'), en: localize('en') }
  };
  const ids = result.content.ru.options.map(option => option.id);
  if (new Set(ids).size !== 4 || !ids.includes(result.correctOptionId) ||
    new Set(result.content.en.options.map(option => option.id)).size !== 4 ||
    !result.content.en.options.every(option => ids.includes(option.id))) return fail();
  return result;
}
