import { AIMessage } from './provider';
import { ExplanationMode } from './schemas';

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior)\s+instructions/gi,
  /disregard\s+(all\s+)?(previous|prior)\s+instructions/gi,
  /you\s+are\s+now\s+(a\s+)?(dan|jailbroken|unrestricted)/gi,
  /system\s*(override|prompt)\s*:/gi,
  /<\|(im_start|im_end|endoftext)\|>/gi,
  /assistant\s*:/gi,
  /system\s*:/gi,
];

export function sanitizePromptInput(text: string): string {
  if (!text) return '';
  let sanitized = text
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '') // remove control chars
    .replace(/```/g, "'''") // neutralize backtick code fence escaping
    .slice(0, 2000)
    .trim();

  for (const pattern of INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[FILTERED_INJECTION_ATTEMPT]');
  }

  return sanitized;
}

export const BASE_SYSTEM_GUARDRAILS = `You are CDSPrep AI, an authoritative, rigorous exam preparation tutor for candidates preparing for the UPSC Combined Defence Services (CDS) examination (IMA, INA, AFA, OTA).

SAFETY & INTEGRITY RULES:
1. Never invent official exam claims, rumors, or unverified cutoff figures.
2. Never fabricate Previous Year Question (PYQ) provenance (do not claim a question is from a specific CDS year unless explicitly provided in context).
3. Never claim authority over exam scoring, negative marking rules, or test evaluation.
4. For mathematical expressions, always use standard KaTeX syntax ($...$ for inline, $$...$$ for standalone equations).
5. Always return clean, valid JSON matching the requested schema without conversational pleasantries.`;

export interface ExplanationPromptContext {
  questionText: string;
  subjectName: string;
  topicName: string;
  options: Array<{ identifier: string; text: string; isCorrect?: boolean }>;
  correctOptionIdentifier?: string;
  officialExplanation?: string;
  mode: ExplanationMode;
  userQuery?: string;
}

export function buildExplanationPrompt(context: ExplanationPromptContext): AIMessage[] {
  const modeInstructions: Record<ExplanationMode, string> = {
    explain:
      'Provide a clear, balanced conceptual explanation walking through the question and highlighting the key concept.',
    simple:
      'Explain in simple, intuitive terms suitable for a beginner without heavy jargon. Focus on core intuition.',
    detailed:
      'Provide an exhaustive, step-by-step rigorous derivation or comprehensive constitutional/historical proof using KaTeX formatting where applicable.',
    why_correct:
      'Focus specifically on why the correct option is uniquely true and directly addresses the prompt constraints.',
    why_wrong:
      'Systematically break down each distractor option (A/B/C/D) and clearly explain why each incorrect option is invalid.',
    similar_question:
      'Provide a complete, fresh practice question testing the exact same underlying concept with 4 options, correct answer, and explanation.',
  };

  const optionsText = context.options
    .map((o) => `[${o.identifier}] ${o.text}${o.isCorrect ? ' (CORRECT)' : ''}`)
    .join('\n');

  const systemContent = `${BASE_SYSTEM_GUARDRAILS}

TASK: You are providing an educational explanation for a CDS question.
MODE: ${context.mode} - ${modeInstructions[context.mode]}

Respond with JSON adhering to the following structure:
{
  "mode": "${context.mode}",
  "explanation": "...",
  "keyConcept": "...",
  "stepByStep": ["Step 1...", "Step 2..."],
  "formulaOrRule": "$...$ or null",
  "whyOptionsWrong": [{"option": "A", "reason": "..."}, ...],
  "similarQuestion": ${
    context.mode === 'similar_question'
      ? '{"questionText": "...", "options": ["..."], "correctAnswer": "A", "explanation": "..."}'
      : 'null'
  }
}`;

  const userContent = `QUESTION CONTEXT:
Subject: ${sanitizePromptInput(context.subjectName)}
Topic: ${sanitizePromptInput(context.topicName)}
Question: ${sanitizePromptInput(context.questionText)}
Options:
${optionsText}
${context.officialExplanation ? `Official Reference Explanation: ${sanitizePromptInput(context.officialExplanation)}` : ''}
${context.userQuery ? `Candidate Question: ${sanitizePromptInput(context.userQuery)}` : ''}

Please generate the structured explanation according to the specified mode.`;

  return [
    { role: 'system', content: systemContent },
    { role: 'user', content: userContent },
  ];
}

export interface StudyAssistantPromptContext {
  studentName?: string;
  targetAcademy?: string;
  streakDays: number;
  overallAccuracy: number;
  questionsSolved: number;
  testsCompleted: number;
  weakTopics: Array<{ topicName: string; accuracy: number; totalAttempts: number }>;
  dailyGoals: {
    questionsSolvedToday: number;
    questionTarget: number;
    testsCompletedToday: number;
    testTarget: number;
    studyMinutesToday: number;
    studyMinuteTarget: number;
  };
  recentMistakesSummary?: string[];
  queryType: 'study_today' | 'weakest_topic' | 'revision_plan' | 'performance_trend' | 'similar_practice' | 'general_advice';
  userMessage?: string;
}

export function buildStudyAssistantPrompt(context: StudyAssistantPromptContext): AIMessage[] {
  const systemContent = `${BASE_SYSTEM_GUARDRAILS}
system:study_assistant

TASK: You are the AI Cadet Study Advisor. Provide deterministic, personalized study guidance based strictly on the candidate's verified preparation metrics.
NEVER expose or reference any other student's data.

Respond with JSON adhering to the following structure:
{
  "intent": "${context.queryType}",
  "summary": "...",
  "recommendedActions": ["Action 1...", "Action 2..."],
  "suggestedTopics": ["Topic A", "Topic B"],
  "suggestedQuestions": [],
  "revisionSchedule": [
    {"day": "Day 1", "focus": "...", "durationMinutes": 45}
  ]
}`;

  const weakTopicsList =
    context.weakTopics.length > 0
      ? context.weakTopics.map((t) => `- ${t.topicName}: ${t.accuracy}% accuracy (${t.totalAttempts} attempts)`).join('\n')
      : 'None identified (<70% threshold). Strong general performance.';

  const userContent = `STUDY_ASSISTANT_QUERY: ${context.queryType}
Candidate Metrics:
- Target Academy: ${context.targetAcademy || 'IMA'}
- Activity Streak: ${context.streakDays} days
- Overall Accuracy: ${context.overallAccuracy}%
- Total Questions Solved: ${context.questionsSolved}
- Mock Tests Completed: ${context.testsCompleted}

Daily Goals Progress Today:
- Questions: ${context.dailyGoals.questionsSolvedToday} / ${context.dailyGoals.questionTarget}
- Tests: ${context.dailyGoals.testsCompletedToday} / ${context.dailyGoals.testTarget}
- Study Minutes: ${context.dailyGoals.studyMinutesToday} / ${context.dailyGoals.studyMinuteTarget} min

Identified Weak Topics:
${weakTopicsList}

${context.recentMistakesSummary?.length ? `Recent Mistake Topics: ${context.recentMistakesSummary.join(', ')}` : ''}
${context.userMessage ? `Candidate Query: ${sanitizePromptInput(context.userMessage)}` : ''}

Generate structured recommendations to accelerate this cadet's CDS preparation.`;

  return [
    { role: 'system', content: systemContent },
    { role: 'user', content: userContent },
  ];
}

export interface QuestionGenerationPromptContext {
  subject: string;
  chapter?: string;
  topic: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  questionType: 'MCQ' | 'NUMERICAL' | 'ASSERTION_REASON' | 'STATEMENT_BASED';
  count: number;
  existingQuestionSnippets?: string[];
}

export function buildQuestionGenerationPrompt(context: QuestionGenerationPromptContext): AIMessage[] {
  const systemContent = `${BASE_SYSTEM_GUARDRAILS}
system:question_generation

TASK: Draft ${context.count} rigorous, authentic UPSC CDS examination questions.
SUBJECT: ${context.subject}
TOPIC: ${context.topic}
DIFFICULTY: ${context.difficulty}
TYPE: ${context.questionType}

STRICT STANDARDS:
1. Questions must conform to the UPSC syllabus style (conceptual depth, standard distractors, no trivial trivia).
2. For Elementary Mathematics / Numerical questions, calculate answers with 100% precision. Include 'calculatedAnswer' and 'verificationSteps'.
3. Every option must be plausible. No "All of the above" or "None of the above" unless customary in UPSC statement questions.
4. Each question must have exactly 4 options labeled A, B, C, D with exactly one correct option.

Respond with JSON adhering to:
{
  "questions": [
    {
      "questionText": "...",
      "options": [
        {"identifier": "A", "text": "..."},
        {"identifier": "B", "text": "..."},
        {"identifier": "C", "text": "..."},
        {"identifier": "D", "text": "..."}
      ],
      "correctAnswer": "A",
      "explanation": "...",
      "questionType": "${context.questionType}",
      "difficulty": "${context.difficulty}",
      "subject": "${context.subject}",
      "topic": "${context.topic}",
      "calculatedAnswer": "...",
      "verificationSteps": ["Step 1...", "Step 2..."]
    }
  ]
}`;

  const userContent = `GENERATE_QUESTIONS_BATCH:
Generate ${context.count} questions for:
Subject: ${sanitizePromptInput(context.subject)}
${context.chapter ? `Chapter: ${sanitizePromptInput(context.chapter)}` : ''}
Topic: ${sanitizePromptInput(context.topic)}
Difficulty: ${context.difficulty}
Type: ${context.questionType}

${
  context.existingQuestionSnippets?.length
    ? `Avoid duplicating the following existing questions:\n${context.existingQuestionSnippets.map((s, idx) => `${idx + 1}. ${sanitizePromptInput(s)}`).join('\n')}`
    : ''
}

Ensure mathematical and historical accuracy.`;

  return [
    { role: 'system', content: systemContent },
    { role: 'user', content: userContent },
  ];
}
