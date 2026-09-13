import { describe, it, expect, vi } from 'vitest';
import {
  QueueName,
  DEFAULT_JOB_OPTIONS,
  generateJobKey,
  QUEUE_CONCURRENCY,
  calculateBackoffWithJitter,
  createDeadLetterRecord,
} from '../src/queues/queue.constants';
import { NotificationProcessor } from '../src/jobs/notification.processor';
import { LeaderboardProcessor } from '../src/jobs/leaderboard.processor';
import { AnalyticsProcessor } from '../src/jobs/analytics.processor';
import { AiTaskProcessor } from '../src/jobs/ai-task.processor';
import { NotificationCategory, LeaderboardPeriod } from '@cdsprep/types';

describe('Worker Queue Infrastructure & Processors', () => {
  describe('Job Options & Deduplication (Anti-Spam & Retries)', () => {
    it('defines exponential backoff with 3 attempts to prevent cascading failures', () => {
      expect(DEFAULT_JOB_OPTIONS.attempts).toBe(3);
      expect(DEFAULT_JOB_OPTIONS.backoff.type).toBe('exponential');
      expect(DEFAULT_JOB_OPTIONS.backoff.delay).toBeGreaterThanOrEqual(2000);
      expect(DEFAULT_JOB_OPTIONS.removeOnComplete).toBeDefined();
    });

    it('generates deterministic deduplication keys for idempotent dispatch', () => {
      const payloadA = { userId: 'cadet-101', category: 'TEST_RESULT', attemptId: 'att-99' };
      const payloadB = { category: 'TEST_RESULT', attemptId: 'att-99', userId: 'cadet-101' }; // different key ordering

      const keyA = generateJobKey('notif', payloadA);
      const keyB = generateJobKey('notif', payloadB);

      expect(keyA).toBe(keyB);
      expect(keyA).toContain('notif:');
    });

    it('generates distinct keys for distinct job payloads', () => {
      const key1 = generateJobKey('notif', { userId: 'cadet-101' });
      const key2 = generateJobKey('notif', { userId: 'cadet-102' });

      expect(key1).not.toBe(key2);
    });
  });

  describe('Notification Processor', () => {
    it('processes notification payload asynchronously', async () => {
      const processor = new NotificationProcessor();
      const res = await processor.process({
        userId: 'cadet-101',
        category: NotificationCategory.TEST_RESULT,
        title: 'Mock 01 Result Available',
        message: 'Your mock test result is ready with 85% accuracy.',
      });

      expect(res.processed).toBe(true);
      expect(res.deliveredAt).toBeDefined();
    });
  });

  describe('Leaderboard Processor', () => {
    it('aggregates leaderboard standings for given period', async () => {
      const processor = new LeaderboardProcessor();
      const res = await processor.process({
        period: LeaderboardPeriod.WEEKLY,
        targetAcademy: 'IMA',
      });

      expect(res.processed).toBe(true);
      expect(res.period).toBe(LeaderboardPeriod.WEEKLY);
      expect(res.aggregatedAt).toBeDefined();
    });
  });

  describe('Analytics & AI Processors', () => {
    it('executes analytics aggregation off request thread', async () => {
      const processor = new AnalyticsProcessor();
      const res = await processor.process({
        userId: 'cadet-101',
        triggerEvent: 'MOCK_SUBMITTED',
        timestamp: new Date().toISOString(),
      });

      expect(res.processed).toBe(true);
      expect(res.userId).toBe('cadet-101');
    });

    it('executes AI batch task in worker pipeline', async () => {
      const processor = new AiTaskProcessor();
      const res = await processor.process({
        taskId: 'ai-task-01',
        taskType: 'EXPLANATION_PREWARM',
        payload: { questionId: 'q-99' },
      });

      expect(res.processed).toBe(true);
      expect(res.taskId).toBe('ai-task-01');
    });
  });

  describe('Phase 16 — Performance Tuning: Concurrency, Jitter & Dead-Letter Handling', () => {
    it('defines distinct concurrency limits tailored for throughput and resource safety', () => {
      expect(QUEUE_CONCURRENCY[QueueName.NOTIFICATIONS]).toBe(10);
      expect(QUEUE_CONCURRENCY[QueueName.LEADERBOARD_ROLLUP]).toBe(2);
      expect(QUEUE_CONCURRENCY[QueueName.ANALYTICS_AGGREGATION]).toBe(5);
      expect(QUEUE_CONCURRENCY[QueueName.AI_TASKS]).toBe(3);
      expect(QUEUE_CONCURRENCY[QueueName.DEAD_LETTER]).toBe(1);
    });

    it('calculates exponential backoff with randomized jitter to prevent thundering herd', () => {
      const delay1 = calculateBackoffWithJitter(1, 2000);
      expect(delay1).toBeGreaterThanOrEqual(2000);
      expect(delay1).toBeLessThanOrEqual(2400); // 2000 + 20% jitter max

      const delay2 = calculateBackoffWithJitter(2, 2000);
      expect(delay2).toBeGreaterThanOrEqual(4000);
      expect(delay2).toBeLessThanOrEqual(4800);
    });

    it('creates standardized dead-letter quarantine records on terminal job failure', () => {
      const dlq = createDeadLetterRecord(
        QueueName.NOTIFICATIONS,
        'job-failed-456',
        { userId: 'cadet-101' },
        new Error('SMTP Gateway Connection Timeout'),
        3,
      );

      expect(dlq.failedQueue).toBe(QueueName.NOTIFICATIONS);
      expect(dlq.jobId).toBe('job-failed-456');
      expect(dlq.failedReason).toBe('SMTP Gateway Connection Timeout');
      expect(dlq.attemptsMade).toBe(3);
      expect(dlq.failedAt).toBeDefined();
    });
  });
});
