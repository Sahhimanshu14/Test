import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

let RedisClientClass: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const imported = require('ioredis');
  RedisClientClass = imported?.default || imported;
} catch {
  // Gracefully fallback to high-speed in-memory cache
}

export const CACHE_TTL = {
  LEADERBOARD: 120, // 2 minutes
  PYQS: 3600, // 1 hour
  SUBJECTS: 7200, // 2 hours
  TEST_METADATA: 1800, // 30 minutes
  SHORT: 60, // 1 minute
} as const;

export const CACHE_PREFIX = {
  LEADERBOARD: 'cdsprep:cache:leaderboard',
  PYQS: 'cdsprep:cache:pyqs',
  SUBJECTS: 'cdsprep:cache:subjects',
  TESTS: 'cdsprep:cache:tests',
} as const;

interface MemoryCacheEntry<T> {
  value: T;
  expiresAt: number;
}

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private redis: any = null;
  private isRedisConnected = false;
  private readonly memoryCache = new Map<string, MemoryCacheEntry<any>>();

  // Prohibited key substrings for sensitive data protection
  private static readonly PROHIBITED_SENSITIVE_PATTERNS = [
    'password',
    'secret',
    'token',
    'hash',
    'cookie',
    'auth:session',
    'credential',
    'payment:signature',
  ];

  constructor(private readonly config: ConfigService) {
    this.initRedis();
  }

  private initRedis() {
    if (!RedisClientClass) {
      this.isRedisConnected = false;
      return;
    }

    try {
      const isProduction = this.config.get<string>('NODE_ENV') === 'production';
      const redisUrl =
        this.config.get<string>('REDIS_URL') ||
        `redis://${this.config.get<string>('REDIS_HOST', 'localhost')}:${this.config.get<number>('REDIS_PORT', 6379)}`;

      const isTls = redisUrl.startsWith('rediss://') || this.config.get<string>('REDIS_TLS') === 'true';

      this.redis = new RedisClientClass(redisUrl, {
        lazyConnect: true,
        enableOfflineQueue: false,
        maxRetriesPerRequest: isProduction ? 3 : 1,
        ...(isTls ? { tls: { rejectUnauthorized: isProduction } } : {}),
        retryStrategy: (times: number) => {
          if (!isProduction) {
            return null; // Do not infinite loop in local/test if Redis is absent
          }
          if (times > 10) {
            this.logger.error(`Redis reconnection attempts exceeded max threshold (${times}).`);
            return null;
          }
          const delay = Math.min(times * 200, 3000);
          return delay + Math.floor(Math.random() * 100); // Backoff with jitter
        },
      });

      this.redis.connect()
        .then(() => {
          this.isRedisConnected = true;
          this.logger.log(`Redis cache connection established successfully (TLS: ${isTls ? 'enabled' : 'disabled'}).`);
        })
        .catch((err: any) => {
          this.isRedisConnected = false;
          this.logger.warn(
            `Redis connection unavailable (${err.message}). Defaulting to high-performance in-memory cache fallback.`,
          );
        });

      this.redis.on('error', () => {
        this.isRedisConnected = false;
      });
    } catch (err: any) {
      this.isRedisConnected = false;
      this.logger.warn(
        `Failed to initialize Redis client (${err.message}). Using in-memory cache store.`,
      );
    }
  }

  /**
   * Enforces strict safety against caching sensitive secrets or authentication tokens
   */
  private assertNotSensitive(key: string): void {
    const lowerKey = key.toLowerCase();
    for (const pattern of CacheService.PROHIBITED_SENSITIVE_PATTERNS) {
      if (lowerKey.includes(pattern)) {
        throw new Error(
          `Security violation: Attempted to cache sensitive data under key pattern "${key}" matching prohibited rule "${pattern}".`,
        );
      }
    }
  }

  /**
   * Get value from cache with type safety
   */
  async get<T>(key: string): Promise<T | null> {
    this.assertNotSensitive(key);

    if (this.isRedisConnected && this.redis) {
      try {
        const raw = await this.redis.get(key);
        if (raw) {
          return JSON.parse(raw) as T;
        }
        return null;
      } catch (err) {
        this.logger.debug(`Redis get failed for key ${key}, checking fallback`);
      }
    }

    // Memory fallback
    const entry = this.memoryCache.get(key);
    if (entry) {
      if (Date.now() > entry.expiresAt) {
        this.memoryCache.delete(key);
        return null;
      }
      return entry.value as T;
    }

    return null;
  }

  /**
   * Set value in cache with expiration in seconds
   */
  async set<T>(key: string, value: T, ttlSeconds: number = CACHE_TTL.SHORT): Promise<void> {
    this.assertNotSensitive(key);

    if (this.isRedisConnected && this.redis) {
      try {
        await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
        return;
      } catch (err) {
        this.logger.debug(`Redis set failed for key ${key}, saving to fallback`);
      }
    }

    // Memory fallback
    this.memoryCache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Delete specific key from cache
   */
  async del(key: string): Promise<void> {
    if (this.isRedisConnected && this.redis) {
      try {
        await this.redis.del(key);
      } catch {
        // ignore
      }
    }
    this.memoryCache.delete(key);
  }

  /**
   * Delete all keys matching prefix for cache invalidation
   */
  async delPrefix(prefix: string): Promise<void> {
    if (this.isRedisConnected && this.redis) {
      try {
        const stream = this.redis.scanStream({
          match: `${prefix}*`,
          count: 100,
        });

        stream.on('data', (keys: string[]) => {
          if (keys.length && this.redis) {
            this.redis.del(...keys);
          }
        });
      } catch {
        // fallback
      }
    }

    // Invalidate from memory cache
    for (const key of Array.from(this.memoryCache.keys())) {
      if (key.startsWith(prefix)) {
        this.memoryCache.delete(key);
      }
    }
  }

  /**
   * Cache-Aside Helper: Returns cached value or evaluates fetcher and sets cache
   */
  async wrap<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number = CACHE_TTL.SHORT,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    const fresh = await fetcher();
    if (fresh !== null && fresh !== undefined) {
      await this.set(key, fresh, ttlSeconds);
    }
    return fresh;
  }

  /**
   * Health probe: Pings Redis and measures round-trip latency
   */
  async ping(): Promise<{ ok: boolean; latencyMs: number }> {
    const start = performance.now();
    if (this.isRedisConnected && this.redis) {
      try {
        await this.redis.ping();
        const latencyMs = Math.round((performance.now() - start) * 100) / 100;
        return { ok: true, latencyMs };
      } catch {
        return { ok: false, latencyMs: -1 };
      }
    }
    // In-memory fallback is active
    return { ok: true, latencyMs: 0.1 };
  }

  async onModuleDestroy() {
    if (this.redis) {
      try {
        await this.redis.quit();
      } catch {
        // ignore
      }
    }
    this.memoryCache.clear();
  }
}
