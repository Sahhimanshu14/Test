export interface ModelPricing {
  promptPricePerMillionUSD: number;
  completionPricePerMillionUSD: number;
}

export const DEFAULT_PRICING: ModelPricing = {
  promptPricePerMillionUSD: 0.15,
  completionPricePerMillionUSD: 0.60,
};

export const MODEL_PRICING: Record<string, ModelPricing> = {
  'gpt-4o-mini': {
    promptPricePerMillionUSD: 0.15,
    completionPricePerMillionUSD: 0.60,
  },
  'gpt-4o': {
    promptPricePerMillionUSD: 2.50,
    completionPricePerMillionUSD: 10.00,
  },
  'gemini-1.5-flash': {
    promptPricePerMillionUSD: 0.075,
    completionPricePerMillionUSD: 0.30,
  },
  'gemini-1.5-pro': {
    promptPricePerMillionUSD: 1.25,
    completionPricePerMillionUSD: 5.00,
  },
  'claude-3-5-sonnet': {
    promptPricePerMillionUSD: 3.00,
    completionPricePerMillionUSD: 15.00,
  },
  'claude-3-haiku': {
    promptPricePerMillionUSD: 0.25,
    completionPricePerMillionUSD: 1.25,
  },
};

export interface QuotaCheckResult {
  allowed: boolean;
  queriesToday: number;
  dailyLimit: number;
  queriesThisMonth: number;
  monthlyLimit: number;
  remainingDaily: number;
  message?: string;
}

export interface UserUsageRecord {
  queriesToday: number;
  queriesThisMonth: number;
  tokensToday: number;
  totalTokens: number;
  estimatedCostUSD: number;
  lastQueryDate: string; // YYYY-MM-DD
  lastQueryMonth: string; // YYYY-MM
}

export class AICostTracker {
  private readonly dailyQueryLimit: number;
  private readonly monthlyQueryLimit: number;
  private readonly usageMap = new Map<string, UserUsageRecord>();

  constructor(options?: { dailyQueryLimit?: number; monthlyQueryLimit?: number }) {
    this.dailyQueryLimit = options?.dailyQueryLimit ?? 50;
    this.monthlyQueryLimit = options?.monthlyQueryLimit ?? 500;
  }

  private getCurrentDateString(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private getCurrentMonthString(): string {
    return new Date().toISOString().slice(0, 7);
  }

  private getOrInitUser(userId: string): UserUsageRecord {
    const today = this.getCurrentDateString();
    const month = this.getCurrentMonthString();

    let record = this.usageMap.get(userId);
    if (!record) {
      record = {
        queriesToday: 0,
        queriesThisMonth: 0,
        tokensToday: 0,
        totalTokens: 0,
        estimatedCostUSD: 0,
        lastQueryDate: today,
        lastQueryMonth: month,
      };
      this.usageMap.set(userId, record);
      return record;
    }

    // Reset daily if date changed
    if (record.lastQueryDate !== today) {
      record.queriesToday = 0;
      record.tokensToday = 0;
      record.lastQueryDate = today;
    }

    // Reset monthly if month changed
    if (record.lastQueryMonth !== month) {
      record.queriesThisMonth = 0;
      record.lastQueryMonth = month;
    }

    return record;
  }

  /**
   * Check whether the user has sufficient quota for an AI query.
   */
  checkQuota(userId: string): QuotaCheckResult {
    const user = this.getOrInitUser(userId);

    if (user.queriesToday >= this.dailyQueryLimit) {
      return {
        allowed: false,
        queriesToday: user.queriesToday,
        dailyLimit: this.dailyQueryLimit,
        queriesThisMonth: user.queriesThisMonth,
        monthlyLimit: this.monthlyQueryLimit,
        remainingDaily: 0,
        message: `Daily AI quota of ${this.dailyQueryLimit} queries reached. Quota resets at midnight UTC.`,
      };
    }

    if (user.queriesThisMonth >= this.monthlyQueryLimit) {
      return {
        allowed: false,
        queriesToday: user.queriesToday,
        dailyLimit: this.dailyQueryLimit,
        queriesThisMonth: user.queriesThisMonth,
        monthlyLimit: this.monthlyQueryLimit,
        remainingDaily: 0,
        message: `Monthly AI quota of ${this.monthlyQueryLimit} queries reached.`,
      };
    }

    return {
      allowed: true,
      queriesToday: user.queriesToday,
      dailyLimit: this.dailyQueryLimit,
      queriesThisMonth: user.queriesThisMonth,
      monthlyLimit: this.monthlyQueryLimit,
      remainingDaily: this.dailyQueryLimit - user.queriesToday,
    };
  }

  /**
   * Record token consumption and calculate estimated USD cost.
   */
  recordUsage(
    userId: string,
    model: string,
    promptTokens: number,
    completionTokens: number,
  ): { costUSD: number; userTotalTokens: number } {
    const user = this.getOrInitUser(userId);
    const totalTokens = promptTokens + completionTokens;

    user.queriesToday += 1;
    user.queriesThisMonth += 1;
    user.tokensToday += totalTokens;
    user.totalTokens += totalTokens;

    const pricing = MODEL_PRICING[model] ?? DEFAULT_PRICING;
    const queryCostUSD =
      (promptTokens / 1_000_000) * pricing.promptPricePerMillionUSD +
      (completionTokens / 1_000_000) * pricing.completionPricePerMillionUSD;

    user.estimatedCostUSD += queryCostUSD;

    return {
      costUSD: queryCostUSD,
      userTotalTokens: user.totalTokens,
    };
  }

  getUserUsage(userId: string): UserUsageRecord {
    return { ...this.getOrInitUser(userId) };
  }

  calculateCost(model: string, promptTokens: number, completionTokens: number): number {
    const pricing = MODEL_PRICING[model] ?? DEFAULT_PRICING;
    return (
      (promptTokens / 1_000_000) * pricing.promptPricePerMillionUSD +
      (completionTokens / 1_000_000) * pricing.completionPricePerMillionUSD
    );
  }
}
