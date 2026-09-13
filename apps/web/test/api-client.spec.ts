import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { apiClient } from '../src/lib/api-client';

describe('Web ApiClient Suite', () => {
  let localStorageStore: Record<string, string> = {};

  beforeEach(() => {
    localStorageStore = {};

    // Mock localStorage in test environment
    const mockLocalStorage = {
      getItem: vi.fn((key: string) => localStorageStore[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        localStorageStore[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete localStorageStore[key];
      }),
      clear: vi.fn(() => {
        localStorageStore = {};
      }),
    };

    vi.stubGlobal('localStorage', mockLocalStorage);
    vi.stubGlobal('window', {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('attaches Authorization header when access token is stored', async () => {
    apiClient.setTokens('access-token-123', 'refresh-token-456');

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: { message: 'Cadet profile loaded' } }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await apiClient.get('/users/profile');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/users/profile'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token-123',
        }),
      }),
    );
    expect(result).toEqual({ message: 'Cadet profile loaded' });
  });

  it('handles post requests with serialized JSON body', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ success: true, data: { id: 'attempt-1' } }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await apiClient.post('/attempts/start', { testId: 'cds-mock-1' });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/attempts/start'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ testId: 'cds-mock-1' }),
      }),
    );
    expect(result).toEqual({ id: 'attempt-1' });
  });

  it('throws ApiError with statusCode and message on HTTP error response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ message: 'Mock test not found' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await expect(apiClient.get('/tests/non-existent')).rejects.toEqual(
      expect.objectContaining({
        statusCode: 404,
        message: 'Mock test not found',
      }),
    );
  });

  it('attempts token refresh on 401 and retries original request upon success', async () => {
    apiClient.setTokens('expired-access-tok', 'valid-refresh-tok');

    const mockFetch = vi
      .fn()
      // First call (original request) returns 401
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Unauthorized' }),
      })
      // Second call (POST /auth/refresh) succeeds
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: {
            accessToken: 'new-fresh-access-tok',
            refreshToken: 'new-fresh-refresh-tok',
          },
        }),
      })
      // Third call (retried request) succeeds
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: { status: 'ok' } }),
      });

    vi.stubGlobal('fetch', mockFetch);

    const res = await apiClient.get('/protected-resource');

    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(res).toEqual({ status: 'ok' });
    expect(localStorage.setItem).toHaveBeenCalledWith(
      'cdsprep_access_token',
      'new-fresh-access-tok',
    );
  });

  it('clears tokens and throws error when token refresh also fails', async () => {
    apiClient.setTokens('expired-access-tok', 'expired-refresh-tok');

    const mockFetch = vi
      .fn()
      // First call returns 401
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Unauthorized' }),
      })
      // Second call (refresh) returns 401
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Refresh token expired' }),
      });

    vi.stubGlobal('fetch', mockFetch);

    await expect(apiClient.get('/protected-resource')).rejects.toEqual(
      expect.objectContaining({
        statusCode: 401,
      }),
    );

    expect(localStorage.removeItem).toHaveBeenCalledWith('cdsprep_access_token');
    expect(localStorage.removeItem).toHaveBeenCalledWith('cdsprep_refresh_token');
  });
});
