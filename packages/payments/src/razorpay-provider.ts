import { createHmac, timingSafeEqual } from 'crypto';
import {
  PaymentProvider,
  CreateOrderOptions,
  OrderResult,
  VerifyPaymentOptions,
  WebhookEvent,
} from './provider.interface';

export interface RazorpayConfig {
  keyId: string;
  keySecret: string;
  webhookSecret?: string;
  baseUrl?: string;
  timeoutMs?: number;
}

export class RazorpayProvider implements PaymentProvider {
  readonly providerName = 'razorpay';
  private readonly keyId: string;
  private readonly keySecret: string;
  private readonly webhookSecret?: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(config: RazorpayConfig) {
    if (!config.keyId || !config.keySecret) {
      throw new Error('RazorpayProvider requires keyId and keySecret');
    }
    this.keyId = config.keyId.trim();
    this.keySecret = config.keySecret.trim();
    this.webhookSecret = config.webhookSecret?.trim();
    this.baseUrl = (config.baseUrl || 'https://api.razorpay.com/v1').replace(/\/+$/, '');
    this.timeoutMs = config.timeoutMs || 10000;
  }

  async createOrder(options: CreateOrderOptions): Promise<OrderResult> {
    const authHeader = `Basic ${Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64')}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(`${this.baseUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify({
          amount: options.amountInSmallestUnit,
          currency: options.currency || 'INR',
          receipt: options.receipt,
          notes: options.notes,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        throw new Error(`Razorpay order creation failed status ${res.status}: ${errorText}`);
      }

      const data = (await res.json()) as { id: string; amount: number; currency: string; status: string };

      return {
        orderId: data.id,
        amount: data.amount,
        currency: data.currency,
        status: data.status,
        keyId: this.keyId,
      };
    } catch (err: unknown) {
      clearTimeout(timer);
      throw err;
    }
  }

  /**
   * Cryptographically verifies client-side checkout payment signature.
   * Uses timingSafeEqual to protect against timing side-channel attacks.
   */
  verifyPaymentSignature(options: VerifyPaymentOptions): boolean {
    if (!options.signature || !options.orderId || !options.paymentId) {
      return false;
    }

    try {
      const body = `${options.orderId}|${options.paymentId}`;
      const expectedSignature = createHmac('sha256', this.keySecret)
        .update(body)
        .digest('hex');

      const expectedBuf = Buffer.from(expectedSignature, 'utf-8');
      const receivedBuf = Buffer.from(options.signature, 'utf-8');

      if (expectedBuf.length !== receivedBuf.length) {
        return false;
      }

      return timingSafeEqual(expectedBuf, receivedBuf);
    } catch {
      return false;
    }
  }

  /**
   * Cryptographically verifies server-side incoming webhook signature against raw request body.
   */
  verifyWebhookSignature(rawBody: string | Buffer, signature: string, secret?: string): boolean {
    const effectiveSecret = secret || this.webhookSecret;
    if (!effectiveSecret) {
      throw new Error('Razorpay webhook secret is not configured');
    }
    if (!signature) {
      return false;
    }

    try {
      const expectedSignature = createHmac('sha256', effectiveSecret)
        .update(rawBody)
        .digest('hex');

      const expectedBuf = Buffer.from(expectedSignature, 'utf-8');
      const receivedBuf = Buffer.from(signature, 'utf-8');

      if (expectedBuf.length !== receivedBuf.length) {
        return false;
      }

      return timingSafeEqual(expectedBuf, receivedBuf);
    } catch {
      return false;
    }
  }

  parseWebhookEvent(rawBody: string | Buffer, signature: string): WebhookEvent {
    if (!this.verifyWebhookSignature(rawBody, signature)) {
      throw new Error('Invalid Razorpay webhook signature');
    }

    const text = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf-8');
    const parsed = JSON.parse(text);

    return {
      id: parsed.id || `rzp_evt_${parsed.created_at || Date.now()}`,
      event: parsed.event,
      payload: parsed.payload,
      createdAt: parsed.created_at ? new Date(parsed.created_at * 1000) : new Date(),
    };
  }
}
