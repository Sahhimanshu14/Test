import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  MockEmailProvider,
  ResendProvider,
  SendGridProvider,
  getEmailProvider,
  createEmailVerificationTemplate,
  createPasswordResetTemplate,
  createPasswordChangedTemplate,
  createWelcomeCadetTemplate,
  createTestResultTemplate,
  createStudyReminderTemplate,
  createWeeklySummaryTemplate,
  createSecurityAlertTemplate,
} from '../src';

describe('Transactional Email Service (@cdsprep/email)', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('MockEmailProvider', () => {
    it('captures sent messages in memory and provides inspection helpers', async () => {
      const provider = new MockEmailProvider();
      const result = await provider.sendEmail({
        to: 'cadet@example.com',
        subject: 'Test Subject',
        html: '<p>Test</p>',
        text: 'Test',
      });

      expect(result.success).toBe(true);
      expect(result.id).toBeDefined();
      expect(provider.sentEmails).toHaveLength(1);
      expect(provider.getLastSentEmail()?.to).toBe('cadet@example.com');

      const matches = provider.findSentTo('cadet@example.com');
      expect(matches).toHaveLength(1);

      provider.clear();
      expect(provider.sentEmails).toHaveLength(0);
    });

    it('simulates delivery failure when configured', async () => {
      const provider = new MockEmailProvider({
        simulateFailure: true,
        customErrorMessage: 'Simulated SMTP connection timeout',
      });

      const result = await provider.sendEmail({
        to: 'cadet@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
        text: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Simulated SMTP connection timeout');
    });
  });

  describe('ResendProvider', () => {
    it('throws when initialized with empty API key', () => {
      expect(() => new ResendProvider({ apiKey: '', defaultFrom: 'test@cdsprep.com' })).toThrowError(/apiKey/);
    });

    it('sends email via Resend API and parses message ID', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'resend-msg-123' }),
      } as Response);

      const provider = new ResendProvider({
        apiKey: 're_test_key_123',
        defaultFrom: 'notifications@cdsprep.com',
      });

      const res = await provider.sendEmail({
        to: 'cadet@example.com',
        subject: 'Welcome Cadet',
        html: '<p>Welcome</p>',
        text: 'Welcome',
      });

      expect(res.success).toBe(true);
      expect(res.id).toBe('resend-msg-123');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.resend.com/emails',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer re_test_key_123',
          }),
        }),
      );
    });

    it('retries on rate limit (429) then succeeds', async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          text: async () => 'Too Many Requests',
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 'resend-msg-recovered' }),
        } as Response);

      const provider = new ResendProvider({
        apiKey: 're_test_key',
        defaultFrom: 'test@cdsprep.com',
        maxRetries: 1,
      });

      const res = await provider.sendEmail({
        to: 'cadet@example.com',
        subject: 'Retry Test',
        html: '<p>Retry</p>',
        text: 'Retry',
      });

      expect(res.success).toBe(true);
      expect(res.id).toBe('resend-msg-recovered');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('SendGridProvider', () => {
    it('throws when initialized with empty API key', () => {
      expect(() => new SendGridProvider({ apiKey: '', defaultFrom: 'test@cdsprep.com' })).toThrowError(/apiKey/);
    });

    it('formats v3 payload and sends email via SendGrid', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ 'x-message-id': 'sg-msg-789' }),
      } as Response);

      const provider = new SendGridProvider({
        apiKey: 'SG.test_key',
        defaultFrom: 'notifications@cdsprep.com',
      });

      const res = await provider.sendEmail({
        to: 'cadet@example.com',
        subject: 'SendGrid Test',
        html: '<p>SendGrid</p>',
        text: 'SendGrid',
      });

      expect(res.success).toBe(true);
      expect(res.id).toBe('sg-msg-789');
    });
  });

  describe('getEmailProvider Factory', () => {
    it('returns MockEmailProvider when provider is mock or unset', () => {
      const p1 = getEmailProvider();
      expect(p1.providerName).toBe('mock');

      const p2 = getEmailProvider({ provider: 'mock' });
      expect(p2.providerName).toBe('mock');
    });

    it('instantiates ResendProvider when configured with apiKey', () => {
      const p = getEmailProvider({ provider: 'resend', apiKey: 're_valid_key' });
      expect(p.providerName).toBe('resend');
    });

    it('fails fast when real provider is requested without an API key', () => {
      expect(() => getEmailProvider({ provider: 'resend' })).toThrowError(/EMAIL_API_KEY is missing/);
      expect(() => getEmailProvider({ provider: 'sendgrid' })).toThrowError(/EMAIL_API_KEY is missing/);
    });
  });

  describe('Email Templates (All 8 Production Templates)', () => {
    it('generates Email Verification template', () => {
      const rendered = createEmailVerificationTemplate({
        name: 'Rohan Sharma',
        verificationCode: '849201',
        verificationUrl: 'https://cdsprep.com/verify?code=849201',
      });

      expect(rendered.html).toContain('Rohan Sharma');
      expect(rendered.html).toContain('849201');
      expect(rendered.html).toContain('https://cdsprep.com/verify?code=849201');
      expect(rendered.text).toContain('849201');
    });

    it('generates Password Reset template', () => {
      const rendered = createPasswordResetTemplate({
        name: 'Vikram Batra',
        resetUrl: 'https://cdsprep.com/reset-password?token=secret123',
        ipAddress: '103.21.244.2',
      });

      expect(rendered.html).toContain('Vikram Batra');
      expect(rendered.html).toContain('https://cdsprep.com/reset-password?token=secret123');
      expect(rendered.html).toContain('103.21.244.2');
      expect(rendered.text).toContain('https://cdsprep.com/reset-password?token=secret123');
    });

    it('generates Password Changed template', () => {
      const rendered = createPasswordChangedTemplate({
        name: 'Anita Rawat',
        changeTimestamp: '2026-09-13 14:30 UTC',
        device: 'Chrome on MacOS',
      });

      expect(rendered.html).toContain('Anita Rawat');
      expect(rendered.html).toContain('Chrome on MacOS');
      expect(rendered.text).toContain('2026-09-13 14:30 UTC');
    });

    it('generates Welcome Cadet template', () => {
      const rendered = createWelcomeCadetTemplate({
        name: 'Arjun Singh',
        targetAcademy: 'IMA Dehradun',
        loginUrl: 'https://cdsprep.com/login',
      });

      expect(rendered.html).toContain('Arjun Singh');
      expect(rendered.html).toContain('IMA Dehradun');
      expect(rendered.text).toContain('IMA Dehradun');
    });

    it('generates Test Result template', () => {
      const rendered = createTestResultTemplate({
        name: 'Kavita Verma',
        testTitle: 'CDS Full Mock Test 04 - Elementary Math',
        netScore: 78.67,
        totalMarks: 100,
        accuracyPercent: 84.5,
        rank: 14,
        totalCadets: 450,
        reviewUrl: 'https://cdsprep.com/results/res-123',
      });

      expect(rendered.html).toContain('78.67');
      expect(rendered.html).toContain('84.5%');
      expect(rendered.html).toContain('#14 / 450');
      expect(rendered.text).toContain('78.67 / 100');
    });

    it('generates Study Streak Reminder template', () => {
      const rendered = createStudyReminderTemplate({
        name: 'Devraj Thapa',
        currentStreak: 12,
        practiceUrl: 'https://cdsprep.com/practice',
      });

      expect(rendered.html).toContain('12-Day Study Streak');
      expect(rendered.html).toContain('Devraj Thapa');
      expect(rendered.text).toContain('12-day study streak');
    });

    it('generates Weekly Summary template', () => {
      const rendered = createWeeklySummaryTemplate({
        name: 'Pooja Nair',
        questionsSolved: 210,
        testsCompleted: 3,
        averageAccuracy: 76.8,
        studyHours: 14.5,
        topWeakSubject: 'General English - Spotting Errors',
        analyticsUrl: 'https://cdsprep.com/analytics',
      });

      expect(rendered.html).toContain('210');
      expect(rendered.html).toContain('76.8%');
      expect(rendered.html).toContain('General English - Spotting Errors');
      expect(rendered.text).toContain('210');
    });

    it('generates Security Alert template', () => {
      const rendered = createSecurityAlertTemplate({
        name: 'Siddharth Rao',
        eventType: 'New login from unrecognized IP',
        timestamp: '2026-09-13 14:20 IST',
        ipAddress: '49.207.198.11',
        location: 'Bengaluru, India',
        actionUrl: 'https://cdsprep.com/security/lock',
      });

      expect(rendered.html).toContain('New login from unrecognized IP');
      expect(rendered.html).toContain('49.207.198.11');
      expect(rendered.html).toContain('Bengaluru, India');
      expect(rendered.text).toContain('New login from unrecognized IP');
    });
  });
});
