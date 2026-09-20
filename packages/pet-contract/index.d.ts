// Общий HTTP-контракт. Только типы; даты передаются как ISO-строки.
export type PetId = 'cat' | 'dog' | 'parrot' | 'dinosaur' | 'dragon';
export type PetMode = 'easy' | 'medium' | 'insane';
export type SessionLengthId = 'short' | 'standard' | 'long';

export type PetStatus = 'pet' | 'grown' | 'left';
export type PetMood = 'joyful' | 'neutral' | 'angry' | 'upset' | 'thoughtful' | 'irritated';
export type PetPeriodOfLife = 'child' | 'teen' | 'adult';
export type PetCareActionId = 'feed' | 'junkFood' | 'clean' | 'play' | 'walk' | 'toggleLight';
export type PetActivityType = 'feeding' | 'treat' | 'cleaning' | 'play' | 'walk' | 'rest';
export type PetPerceptionTagId = 'basic-care' | 'indulgent' | 'engaged-care' | 'rest-routine';
export type PetStatId = 'satiety' | 'cleanliness' | 'happiness' | 'health' | 'energy';
export type PetFarewellReason = 'grown-up' | 'lack-of-care';
export type PetFarewellPhraseId = 'bright-future' | 'ready-for-adventure' | 'needed-more-care';

export interface GuestSession {
  id: string;
  createdAt: string;
  lastSeenAt: string;
}

export interface PetStats {
  satiety: number;
  cleanliness: number;
  happiness: number;
  health: number;
  energy: number;
}

export interface PlayerEnergyState {
  current: number;
  max: number;
  lastRecoveredAt: string;
}

export type PetLastActionAt = Record<PetCareActionId, string | null>;

export interface PetFarewellResult {
  reason: PetFarewellReason;
  farewellAt: string;
  phraseId: PetFarewellPhraseId;
  finalCareScore: number;
  finalStats: PetStats;
}

export interface PetCareActionEntry {
  id: string;
  actionId: PetCareActionId;
  appliedAt: string;
  statsBefore: PetStats;
  statsAfter: PetStats;
  careScoreBefore: number;
  careScoreAfter: number;
  moodBefore: PetMood;
  moodAfter: PetMood;
  isLightOnBefore: boolean;
  isLightOnAfter: boolean;
  awayUntilBefore: string | null;
  awayUntilAfter: string | null;
}

export interface OwnedPet {
  id: string;
  name: string;
  petId: PetId;
  mode: PetMode;
  status: PetStatus;
  mood: PetMood;
  periodOfLife: PetPeriodOfLife;
  stats: PetStats;
  /** Отдельное доверие 0..100; не входит в care score. */
  trust: number;
  sessionLengthId: SessionLengthId;
  createdAt: string;
  endsAt: string;
  lastResolvedAt: string;
  playerEnergy: PlayerEnergyState;
  lastActionAt: PetLastActionAt;
  isLightOn: boolean;
  awayUntil: string | null;
  careHistoryCount: number;
  farewell: PetFarewellResult | null;
}

export type PetCareActionFailureReason = 'cooldown' | 'inactive' | 'away' | 'sleeping' | 'player-energy';

export type PetSceneActionId = PetCareActionId | 'questions';
export interface PetActionAvailability {
  available: boolean;
  reason: PetCareActionFailureReason | QuestionFailureReason | null;
  playerEnergyCost: number;
  cooldownMinutes: number;
  nextAvailableAt: string | null;
}

/** Вычисляемое представление API; actions не сохраняются в БД. */
export interface PetSnapshot extends OwnedPet {
  actions: Record<PetSceneActionId, PetActionAvailability>;
}

export interface PetCareActionResult {
  pet: OwnedPet;
  historyEntry: PetCareActionEntry | null;
  actionId: PetCareActionId;
  applied: boolean;
  reason: PetCareActionFailureReason | null;
  nextAvailableAt: string | null;
}

export interface PetHistoryPage {
  items: PetCareActionEntry[];
  nextCursor: string | null;
}

export interface CreatePetRequest {
  name: string;
  petId: PetId;
  sessionLengthId: SessionLengthId;
}

export interface ApplyCareActionRequest {
  actionId: PetCareActionId;
}

export interface PetCareActionResponse extends Omit<PetCareActionResult, 'pet'> {
  pet: PetSnapshot;
}

export type QuestionLanguage = 'ru' | 'en';
export type QuestionOutcome = 'correct' | 'incorrect' | 'declined';
export type QuestionFailureReason = 'inactive' | 'sleeping' | 'away' | 'cooldown' | 'no-content';

export interface QuestionContent {
  prompt: string;
  options: { id: string; text: string }[];
}

export interface PetQuestionAttempt {
  id: string;
  questionId: string;
  version: number;
  periodOfLife: PetPeriodOfLife;
  language: QuestionLanguage;
  issuedAt: string;
  content: Record<QuestionLanguage, QuestionContent>;
}

export interface PetQuestionResult {
  attempt: PetQuestionAttempt;
  completedAt: string;
  outcome: QuestionOutcome;
  selectedOptionId: string | null;
  correctOptionId: string;
  activityCompleted: boolean;
  happinessChange: number;
  trustChange: number;
  explanation: Record<QuestionLanguage, string>;
}

export interface PetQuestionResponse {
  pet: PetSnapshot;
  attempt: PetQuestionAttempt | null;
  result: PetQuestionResult | null;
  reason: QuestionFailureReason | null;
  nextAvailableAt: string | null;
}

export interface StartQuestionRequest { language: QuestionLanguage; }
export interface AnswerQuestionRequest { optionId: string | null; }
export interface PetQuestionHistoryPage {
  items: PetQuestionResult[];
  nextCursor: string | null;
}
