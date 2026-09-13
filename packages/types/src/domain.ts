import {
  AcademyTarget,
  AttemptStatus,
  DifficultyLevel,
  IntegrityEventType,
  MistakeStatus,
  PracticeMode,
  QuestionPaletteState,
  QuestionType,
  QuestionStatus,
  RoleType,
  TestType,
} from './enums';

export interface UserSummary {
  id: string;
  email: string;
  fullName: string;
  targetAcademy: AcademyTarget;
  avatarUrl?: string | null;
  roles: RoleType[];
  currentStreak: number;
  highestStreak: number;
}

export interface SubjectSummary {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  chapterCount?: number;
  questionCount?: number;
}

export interface ChapterSummary {
  id: string;
  subjectId: string;
  slug: string;
  name: string;
  orderIndex?: number;
  topicCount?: number;
}

export interface TopicSummary {
  id: string;
  chapterId: string;
  slug: string;
  name: string;
  orderIndex?: number;
  subtopicCount?: number;
}

export interface SubtopicSummary {
  id: string;
  topicId: string;
  slug: string;
  name: string;
  orderIndex?: number;
}

export interface QuestionOptionSummary {
  id?: string;
  identifier: string; // 'A', 'B', 'C', 'D'
  optionText: string;
  isCorrect?: boolean;
  orderIndex?: number;
}

export interface QuestionSummary {
  id: string;
  subjectId: string;
  chapterId: string;
  topicId: string;
  subtopicId?: string | null;
  questionType: QuestionType;
  questionText: string;
  marks: number;
  negativeMarks: number;
  difficulty: DifficultyLevel;
  status: QuestionStatus;
  source?: string | null;
  year?: number | null;
  exam?: string | null;
  language?: string;
  tags?: string[];
  metadata?: Record<string, any> | null;
  createdById?: string | null;
  reviewedById?: string | null;
  verifiedAt?: string | Date | null;
  options: QuestionOptionSummary[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
  subject?: { id: string; name: string; slug: string };
  chapter?: { id: string; name: string; slug: string };
  topic?: { id: string; name: string; slug: string };
  subtopic?: { id: string; name: string; slug: string } | null;
}

export interface QuestionDetail extends QuestionSummary {
  explanation?: {
    id?: string;
    explanation: string;
    keyConcept?: string | null;
    trickFormula?: string | null;
  } | null;
}

export interface BulkImportRowError {
  row: number;
  field?: string;
  issue: string;
  question?: string;
}

export interface BulkImportDryRunResult {
  total: number;
  valid: number;
  invalid: number;
  duplicates: number;
  errors: BulkImportRowError[];
  warnings?: string[];
  validPreview?: Array<{
    questionText: string;
    subject: string;
    topic: string;
    questionType: QuestionType;
    difficulty: DifficultyLevel;
  }>;
}

export interface BulkImportCommitResult {
  totalRecords: number;
  successful: number;
  failed: number;
  duplicates: number;
  validationErrors: BulkImportRowError[];
  warnings: string[];
  message: string;
}

export interface ContentDashboardStats {
  totalQuestions: number;
  published: number;
  drafts: number;
  pendingReview: number;
  reported: number;
  archived: number;
  pyqsByYear: Array<{ year: number; count: number }>;
  questionsBySubject: Array<{ subject: string; count: number }>;
  questionsByTopic: Array<{ topic: string; subject: string; count: number }>;
  qualityIssues: {
    missingExplanation: number;
    invalidOptionCount: number;
    unbalancedEquations: number;
    brokenImageReferences: number;
  };
}

export interface AttemptAnswerInput {
  questionId: string;
  selectedOptionId: string | null;
  timeSpentSeconds: number;
  paletteState: QuestionPaletteState;
}

export interface TestAttemptSummary {
  id: string;
  testId: string;
  userId: string;
  status: AttemptStatus;
  startedAt: string;
  expiresAt: string;
  submittedAt?: string | null;
  timeSpentSeconds: number;
}

export interface TestResultSummary {
  id: string;
  testAttemptId: string;
  totalQuestions: number;
  attemptedCount: number;
  correctCount: number;
  incorrectCount: number;
  skippedCount: number;
  grossMarks: number;
  negativeMarks: number;
  netScore: number;
  accuracyPercent: number;
  percentileRank?: number | null;
}

export interface MistakeSummary {
  id: string;
  questionId: string;
  failedCount: number;
  status: MistakeStatus;
  lastMistakeAt: string;
  isCareless: boolean;
}

export interface PYQLicenseMetadata {
  licenseType: string;
  attribution: string;
  sourceUrl?: string | null;
  rightsHolder?: string | null;
  isPublicDomain?: boolean;
  importedBy?: string | null;
  verifiedAt?: string | null;
}

export interface PYQPaperSummary {
  id: string;
  year: number;
  session: string;
  exam: string;
  subjectSlug: string;
  subjectId?: string | null;
  title: string;
  totalMarks: number;
  durationMin: number;
  isPublished: boolean;
  source?: string | null;
  sourceUrl?: string | null;
  licenseType: string;
  attribution?: string | null;
  licenseMetadata?: PYQLicenseMetadata | null;
  testId?: string | null;
  createdAt?: string | Date;
  questionCount?: number;
  subject?: { id: string; name: string; slug: string } | null;
}

export interface PYQQuestionItem {
  id: string;
  questionNumber: number;
  question: QuestionDetail;
}

export interface PYQPaperDetail extends PYQPaperSummary {
  questions: PYQQuestionItem[];
}

export interface PYQFilterParams {
  year?: number;
  session?: string;
  exam?: string;
  subjectSlug?: string;
  subjectId?: string;
  topicId?: string;
  search?: string;
  isPublished?: boolean;
}

export interface PracticeAnswerRecord {
  id: string;
  questionId: string;
  selectedOptionId?: string | null;
  isCorrect?: boolean | null;
  timeSpentSeconds: number;
  isMarkedForReview: boolean;
  orderIndex: number;
  answeredAt?: string | Date | null;
  question?: QuestionDetail;
}

export interface PracticeSessionSummary {
  id: string;
  userId: string;
  mode: PracticeMode;
  subjectId?: string | null;
  chapterId?: string | null;
  topicId?: string | null;
  difficulty?: DifficultyLevel | null;
  questionCount: number;
  randomize: boolean;
  timeLimitMinutes?: number | null;
  enableNegativeMarking: boolean;
  isCompleted: boolean;
  score: number;
  negativeMarks: number;
  correctCount: number;
  incorrectCount: number;
  unattemptedCount: number;
  totalTimeSpentSeconds: number;
  startedAt: string | Date;
  completedAt?: string | Date | null;
  subject?: { id: string; name: string; slug: string } | null;
  chapter?: { id: string; name: string; slug: string } | null;
  topic?: { id: string; name: string; slug: string } | null;
}

export interface PracticeSessionDetail extends PracticeSessionSummary {
  answers: PracticeAnswerRecord[];
  questions: QuestionDetail[];
}

export interface PracticeSessionResult {
  sessionId: string;
  mode: PracticeMode;
  totalQuestions: number;
  attemptedCount: number;
  correctCount: number;
  incorrectCount: number;
  unattemptedCount: number;
  grossMarks: number;
  negativeMarks: number;
  netScore: number;
  accuracyPercent: number;
  totalTimeSpentSeconds: number;
  isCompleted: boolean;
  completedAt: string | Date;
}

export interface IntegrityEventRecord {
  eventType: IntegrityEventType;
  timestamp: string | Date;
  metadata?: Record<string, any> | null;
}

export interface TestSectionSummary {
  id: string;
  testId: string;
  name: string;
  orderIndex: number;
  durationMinutes?: number | null;
  questionCount?: number;
}

export interface TestSummary {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  testType: TestType;
  subjectId?: string | null;
  chapterId?: string | null;
  topicId?: string | null;
  isFullMock: boolean;
  targetAcademy: AcademyTarget;
  durationMinutes: number;
  totalMarks: number;
  passingMarks?: number | null;
  negativeMarks?: number | null;
  randomize?: boolean;
  questionCount?: number | null;
  difficulty?: DifficultyLevel | null;
  instructions?: string | null;
  isPublished: boolean;
  createdAt?: string | Date;
  subject?: { id: string; name: string; slug: string } | null;
  sections?: TestSectionSummary[];
  attemptCount?: number;
}


