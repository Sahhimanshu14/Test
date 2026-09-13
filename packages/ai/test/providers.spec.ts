import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  OpenAIProvider,
  GoogleProvider,
  MockAIProvider,
  getAIProvider,
  AICostTracker,
  MODEL_PRICING,
} from '../src';

describe('AI Providers & Integrations', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('OpenAIProvider', () => {
    it('throws when initialized without an API key', () => {
      expect(() => new OpenAIProvider({ apiKey: '' })).toThrowError(/apiKey/);
    });

    it('successfully calls OpenAI API and formats response', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Mocked OpenAI response content',
            },
          },
        ],
        model: 'gpt-4o-mini',
        usage: {
          prompt_tokens: 15,
          completion_tokens: 25,
          total_tokens: 40,
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const provider = new OpenAIProvider({ apiKey: 'sk-test-key-12345' });
      const res = await provider.generateText([
        { role: 'system', content: 'You are a tutor.' },
        { role: 'user', content: 'Explain Newton laws.' },
      ]);

      expect(res.content).toBe('Mocked OpenAI response content');
      expect(res.model).toBe('gpt-4o-mini');
      expect(res.tokenCost?.totalTokens).toBe(40);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer sk-test-key-12345',
          }),
        }),
      );
    });

    it('retries on rate limit (429) then succeeds', async () => {
      const mockSuccess = {
        choices: [{ message: { content: 'Recovered after retry' } }],
        usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
      };

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          text: async () => 'Rate limit exceeded',
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSuccess,
        } as Response);

      const provider = new OpenAIProvider({ apiKey: 'sk-test-key', maxRetries: 1 });
      const res = await provider.generateText([{ role: 'user', content: 'Hello' }]);

      expect(res.content).toBe('Recovered after retry');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('GoogleProvider', () => {
    it('throws when initialized without an API key', () => {
      expect(() => new GoogleProvider({ apiKey: '' })).toThrowError(/apiKey/);
    });

    it('successfully calls Google Gemini API and formats response', async () => {
      const mockGeminiResponse = {
        candidates: [
          {
            content: {
              parts: [{ text: 'Gemini generated explanation' }],
            },
          },
        ],
        usageMetadata: {
          promptTokenCount: 12,
          candidatesTokenCount: 30,
          totalTokenCount: 42,
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockGeminiResponse,
      } as Response);

      const provider = new GoogleProvider({ apiKey: 'ai-test-google-key' });
      const res = await provider.generateText([
        { role: 'user', content: 'Explain Indian Constitution Article 21' },
      ]);

      expect(res.content).toBe('Gemini generated explanation');
      expect(res.tokenCost?.totalTokens).toBe(42);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('gemini-1.5-flash:generateContent?key=ai-test-google-key'),
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  describe('getAIProvider Factory', () => {
    it('returns MockAIProvider by default or when specified', () => {
      const provider1 = getAIProvider('mock');
      expect(provider1).toBeInstanceOf(MockAIProvider);

      const provider2 = getAIProvider();
      expect(provider2).toBeInstanceOf(MockAIProvider);
    });

    it('instantiates OpenAIProvider when requested with key', () => {
      const provider = getAIProvider('openai', { apiKey: 'sk-test-fake' });
      expect(provider).toBeInstanceOf(OpenAIProvider);
    });

    it('instantiates GoogleProvider when requested with key', () => {
      const provider = getAIProvider('google', { apiKey: 'fake-google-key' });
      expect(provider).toBeInstanceOf(GoogleProvider);
    });

    it('fails fast if OpenAI is selected without an API key', () => {
      expect(() => getAIProvider('openai')).toThrowError(/apiKey/);
    });
  });

  describe('AICostTracker & Quota Controls', () => {
    it('enforces daily query quota', () => {
      const tracker = new AICostTracker({ dailyQueryLimit: 3, monthlyQueryLimit: 10 });
      const userId = 'user-123';

      expect(tracker.checkQuota(userId).allowed).toBe(true);

      tracker.recordUsage(userId, 'gpt-4o-mini', 100, 100);
      tracker.recordUsage(userId, 'gpt-4o-mini', 100, 100);
      expect(tracker.checkQuota(userId).allowed).toBe(true);

      tracker.recordUsage(userId, 'gpt-4o-mini', 100, 100);
      const quota = tracker.checkQuota(userId);
      expect(quota.allowed).toBe(false);
      expect(quota.message).toContain('Daily AI quota');
    });

    it('calculates cost accurately based on model pricing', () => {
      const tracker = new AICostTracker();
      const pricing = MODEL_PRICING['gpt-4o-mini'];

      // 1,000,000 prompt tokens = $0.15, 1,000,000 completion = $0.60
      const cost = tracker.calculateCost('gpt-4o-mini', 1_000_000, 1_000_000);
      expect(cost).toBeCloseTo(0.75, 4);
    });
  });
});
