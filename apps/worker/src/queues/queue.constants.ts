export enum QueueName {
  NOTIFICATIONS = 'notifications-queue',
  LEADERBOARD_ROLLUP = 'leaderboard-rollup-queue',
  ANALYTICS_AGGREGATION = 'analytics-aggregation-queue',
  AI_TASKS = 'ai-tasks-queue',
  DEAD_LETTER = 'dead-letter-queue',
}

export interface DefaultRetryPolicy {
  attempts: number;
  backoff: {
    type: 'exponential' | 'fixed';
    delay: number;
  };
  removeOnComplete: boolean | number;
  removeOnFail: boolean | number;
}

export const DEFAULT_JOB_OPTIONS: DefaultRetryPolicy = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000,
  },
  removeOnComplete: 100,
  removeOnFail: 500,
};

/**
 * Explicit concurrency tuning per queue to balance throughput and system resources
 */
export const QUEUE_CONCURRENCY = {
  [QueueName.NOTIFICATIONS]: 10, // High throughput I/O
  [QueueName.LEADERBOARD_ROLLUP]: 2, // Heavy compute, low concurrency
  [QueueName.ANALYTICS_AGGREGATION]: 5, // DB aggregations
  [QueueName.AI_TASKS]: 3, // Rate-limited external LLM calls
  [QueueName.DEAD_LETTER]: 1, // Sequential quarantine processing
} as const;

/**
 * Generates an idempotent deduplication key for BullMQ jobs
 */
export function generateJobKey(prefix: string, payload: Record<string, any>): string {
  const serialized = Object.keys(payload)
    .sort()
    .map((k) => `${k}:${String(payload[k])}`)
    .join('|');
  return `${prefix}:${Buffer.from(serialized).toString('base64')}`;
}

/**
 * Calculates exponential backoff with randomized jitter to prevent thundering herds
 */
export function calculateBackoffWithJitter(
  attempt: number,
  baseDelayMs = 2000,
  maxDelayMs = 30000,
): number {
  const expDelay = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, Math.max(0, attempt - 1)));
  const jitter = Math.floor(Math.random() * (expDelay * 0.2)); // 0-20% jitter
  return expDelay + jitter;
}

/**
 * Dead-Letter Queue (DLQ) job structure for failed jobs exceeding maximum retries
 */
export interface DeadLetterJobPayload {
  failedQueue: QueueName;
  jobId: string;
  originalPayload: Record<string, any>;
  failedReason: string;
  failedAt: string;
  attemptsMade: number;
}

/**
 * Creates standardized quarantine record for dead-letter processing
 */
export function createDeadLetterRecord(
  failedQueue: QueueName,
  jobId: string,
  originalPayload: Record<string, any>,
  error: Error,
  attemptsMade = 3,
): DeadLetterJobPayload {
  return {
    failedQueue,
    jobId,
    originalPayload,
    failedReason: error.message || 'Unknown unrecoverable execution failure',
    failedAt: new Date().toISOString(),
    attemptsMade,
  };
}
