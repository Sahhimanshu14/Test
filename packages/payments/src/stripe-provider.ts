import { createHmac, timingSafeEqual } from 'crypto';
import {
  PaymentProvider,
  CreateOrderOptions,
  OrderResult,
  VerifyPaymentOptions,
  WebhookEvent,
} from './provider.interface';

export interface StripeConfig {
  secretKey: string;
  publishableKey?: string;
  webhookSecret?: string;
  baseUrl?: string;
  timeoutMs?: number;
}

export class StripeProvider implements PaymentProvider {
  readonly providerName = 'stripe';
  private readonly secretKey: string;
  private readonly publishableKey?: string;
  private readonly webhookSecret?: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(config: StripeConfig) {
    if (!config.secretKey) {
      throw new Error('StripeProvider requires secretKey');
    }
    this.secretKey = config.secretKey.trim();
    this.publishableKey = config.publishableKey?.trim();
    this.webhookSecret = config.webhookSecret?.trim();
    this.baseUrl = (config.baseUrl || 'https://api.stripe.com/v1').replace(/\/+$/, '');
    this.timeoutMs = config.timeoutMs || 10000;
  }

  async createOrder(options: CreateOrderOptions): Promise<OrderResult> {
    const params = new URLSearchParams();
    params.append('amount', String(options.amountInSmallestUnit));
    params.append('currency', (options.currency || 'INR').toLowerCase());
    params.append('metadata[receipt]', options.receipt);

    if (options.notes) {
      for (const [key, value] of Object.entries(options.notes)) {
        params.append(`metadata[${key}]`, value);
      }
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(`${this.baseUrl}/payment_intents`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        throw new Error(`Stripe payment intent creation failed status ${res.status}: ${errorText}`);
      }

      const data = (await res.json()) as {
        id: string;
        amount: number;
        currency: string;
        status: string;
        client_secret?: string;
      };

      return {
        orderId: data.id,
        amount: data.amount,
        currency: data.currency.toUpperCase(),
        status: data.status,
        keyId: this.publishableKey,
        clientSecret: data.client_secret,
      };
    } catch (err: unknown) {
      clearTimeout(timer);
      throw err;
    }
  }

  verifyPaymentSignature(_options: VerifyPaymentOptions): boolean {
    // Stripe client payments are confirmed via webhooks or retrievePaymentIntent
    return true;
  }

  /**
   * Cryptographically verifies incoming Stripe webhook signature header with replay defense.
   * Header format: t=1492774577,v1=5257a869e7ecebeda32affa62cd323080cd4ac16b9b5bd26e1b400d60f28c1d8
   */
  verifyWebhookSignature(rawBody: string | Buffer, signatureHeader: string, secret?: string): boolean {
    const effectiveSecret = secret || this.webhookSecret;
    if (!effectiveSecret) {
      throw new Error('Stripe webhook secret is not configured');
    }
    if (!signatureHeader) {
      return false;
    }

    try {
      const parts = signatureHeader.split(',');
      let timestamp = '';
      const signatures: string[] = [];

      for (const part of parts) {
        const [k, v] = part.split('=');
        if (k === 't') timestamp = v || '';
        if (k === 'v1' && v) signatures.push(v);
      }

      if (!timestamp || signatures.length === 0) {
        return false;
      }

      // Replay attack defense: reject events older than 5 minutes (300 seconds)
      const eventTime = parseInt(timestamp, 10);
      const currentTime = Math.floor(Date.now() / 1000);
      if (Math.abs(currentTime - eventTime) > 300) {
        return false;
      }

      const payload = `${timestamp}.${typeof rawBody === 'string' ? rawBody : rawBody.toString('utf-8')}`;
      const expectedSignature = createHmac('sha256', effectiveSecret)
        .update(payload)
        .digest('hex');

      const expectedBuf = Buffer.from(expectedSignature, 'utf-8');

      return signatures.some((sig) => {
        const sigBuf = Buffer.from(sig, 'utf-8');
        return sigBuf.length === expectedBuf.length && timingSafeEqual(sigBuf, expectedBuf);
      });
    } catch {
      return false;
    }
  }

  parseWebhookEvent(rawBody: string | Buffer, signature: string): WebhookEvent {
    if (!this.verifyWebhookSignature(rawBody, signature)) {
      throw new Error('Invalid Stripe webhook signature');
    }

    const text = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf-8');
    const parsed = JSON.parse(text);

    return {
      id: parsed.id,
      event: parsed.type,
      payload: parsed.data?.object || parsed,
      createdAt: parsed.created ? new Date(parsed.created * 1000) : new Date(),
    };
  }
}
