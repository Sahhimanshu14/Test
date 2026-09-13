import { describe, it, expect, beforeEach } from 'vitest';
import { CacheService, CACHE_PREFIX, CACHE_TTL } from '../src/common/cache/cache.service';
import { ConfigService } from '@nestjs/config';

describe('Phase 16 — Performance Optimization: Redis & In-Memory Caching Layer', () => {
  let cacheService: CacheService;

  beforeEach(() => {
    cacheService = new CacheService(new ConfigService());
  });

  describe('1. Basic Cache Operations & Wrap', () => {
    it('sets and retrieves cached values transparently', async () => {
      await cacheService.set('test:key:1', { foo: 'bar' }, 60);
      const res = await cacheService.get<{ foo: string }>('test:key:1');
      expect(res).toEqual({ foo: 'bar' });
    });

    it('returns null for missing keys', async () => {
      const res = await cacheService.get('test:missing:key');
      expect(res).toBeNull();
    });

    it('wraps database fetchers with cache-aside pattern', async () => {
      let fetchCount = 0;
      const fetcher = async () => {
        fetchCount++;
        return { data: 'heavy_query_result' };
      };

      // First call invokes fetcher
      const res1 = await cacheService.wrap('test:wrapped:key', fetcher, 60);
      expect(res1).toEqual({ data: 'heavy_query_result' });
      expect(fetchCount).toBe(1);

      // Second call uses cached result
      const res2 = await cacheService.wrap('test:wrapped:key', fetcher, 60);
      expect(res2).toEqual({ data: 'heavy_query_result' });
      expect(fetchCount).toBe(1); // Not incremented!
    });
  });

  describe('2. Invalidation & Prefix Deletion', () => {
    it('invalidates single key upon mutation', async () => {
      await cacheService.set('test:del:1', 'active', 60);
      await cacheService.del('test:del:1');
      const res = await cacheService.get('test:del:1');
      expect(res).toBeNull();
    });

    it('invalidates all keys matching a namespace prefix', async () => {
      await cacheService.set(`${CACHE_PREFIX.PYQS}:list:A`, [1, 2], 300);
      await cacheService.set(`${CACHE_PREFIX.PYQS}:list:B`, [3, 4], 300);
      await cacheService.set(`${CACHE_PREFIX.LEADERBOARD}:WEEKLY`, [5, 6], 300);

      await cacheService.delPrefix(CACHE_PREFIX.PYQS);

      expect(await cacheService.get(`${CACHE_PREFIX.PYQS}:list:A`)).toBeNull();
      expect(await cacheService.get(`${CACHE_PREFIX.PYQS}:list:B`)).toBeNull();
      expect(await cacheService.get(`${CACHE_PREFIX.LEADERBOARD}:WEEKLY`)).not.toBeNull();
    });
  });

  describe('3. Sensitive Data Protection', () => {
    it('strictly forbids caching sensitive secrets, tokens, and passwords', async () => {
      await expect(cacheService.set('user:token:123', 'jwt_val', 60)).rejects.toThrow(
        /Security violation/,
      );
      await expect(cacheService.set('user:password:hash', 'argon2_hash', 60)).rejects.toThrow(
        /Security violation/,
      );
      await expect(cacheService.get('auth:session:secret')).rejects.toThrow(
        /Security violation/,
      );
    });
  });
});
