import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebhooksService } from '../src/webhooks/webhooks.service';
import { createHmac } from 'crypto';

describe('Webhooks Ingestion & Cryptographic Verification', () => {
  let webhooksService: WebhooksService;
  let mockPrisma: any;
  let mockAudit: any;

  const webhookSecret = 'test_webhook_secret_key_12345';

  beforeEach(() => {
    process.env.PAYMENT_PROVIDER = 'razorpay';
    process.env.RAZORPAY_KEY_ID = 'rzp_test_123';
    process.env.RAZORPAY_KEY_SECRET = 'secret_test_123';
    process.env.RAZORPAY_WEBHOOK_SECRET = webhookSecret;
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.STRIPE_WEBHOOK_SECRET = webhookSecret;

    mockPrisma = {
      client: {
        auditLog: {
          create: vi.fn().mockResolvedValue({ id: 'audit-1' }),
        },
      },
    };

    mockAudit = {
      log: vi.fn().mockResolvedValue({ id: 'audit-1' }),
    };

    webhooksService = new WebhooksService(mockPrisma, mockAudit);
  });

  describe('Razorpay Webhooks', () => {
    it('throws UnauthorizedException when signature header is missing', async () => {
      await expect(
        webhooksService.handleRazorpayWebhook('{}', undefined),
      ).rejects.toThrowError(/Missing X-Razorpay-Signature/);
    });

    it('rejects tampered or invalid signature', async () => {
      const rawBody = JSON.stringify({ event: 'payment.captured', id: 'evt_1' });
      await expect(
        webhooksService.handleRazorpayWebhook(rawBody, 'invalid_tampered_signature_hex'),
      ).rejects.toThrowError(/Invalid webhook signature/);
    });

    it('successfully processes valid signed webhook payload and logs audit entry', async () => {
      const payload = {
        id: 'evt_rzp_order_paid_001',
        event: 'payment.captured',
        payload: { payment: { entity: { id: 'pay_123', amount: 50000 } } },
      };
      const rawBody = JSON.stringify(payload);
      const signature = createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

      const result = await webhooksService.handleRazorpayWebhook(rawBody, signature);

      expect(result.success).toBe(true);
      expect(result.eventId).toBe('evt_rzp_order_paid_001');
      expect(result.event).toBe('payment.captured');
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'WEBHOOK_PAYMENT_PROCESSED',
          entityType: 'payment',
          entityId: 'evt_rzp_order_paid_001',
        }),
      );
    });

    it('enforces idempotency and ignores duplicate events without re-executing', async () => {
      const payload = {
        id: 'evt_duplicate_test',
        event: 'payment.captured',
      };
      const rawBody = JSON.stringify(payload);
      const signature = createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

      // First call: processed
      const res1 = await webhooksService.handleRazorpayWebhook(rawBody, signature);
      expect(res1.success).toBe(true);

      // Second call with same event ID: idempotent return
      const res2 = await webhooksService.handleRazorpayWebhook(rawBody, signature);
      expect(res2.status).toBe('already_processed');
      expect(mockAudit.log).toHaveBeenCalledTimes(1);
    });
  });

  describe('Stripe Webhooks', () => {
    it('throws UnauthorizedException when signature header is missing', async () => {
      await expect(
        webhooksService.handleStripeWebhook('{}', undefined),
      ).rejects.toThrowError(/Missing Stripe-Signature/);
    });

    it('rejects expired Stripe webhook signatures (>300 seconds old)', async () => {
      const rawBody = JSON.stringify({ id: 'evt_stripe_old' });
      const oldTime = Math.floor(Date.now() / 1000) - 500;
      const sig = createHmac('sha256', webhookSecret)
        .update(`${oldTime}.${rawBody}`)
        .digest('hex');

      await expect(
        webhooksService.handleStripeWebhook(rawBody, `t=${oldTime},v1=${sig}`),
      ).rejects.toThrowError(/Invalid or expired webhook signature/);
    });

    it('processes valid signed Stripe webhook payload', async () => {
      const payload = {
        id: 'evt_stripe_valid_001',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_123', amount: 49900 } },
      };
      const rawBody = JSON.stringify(payload);
      const currentTime = Math.floor(Date.now() / 1000);
      const sig = createHmac('sha256', webhookSecret)
        .update(`${currentTime}.${rawBody}`)
        .digest('hex');

      const result = await webhooksService.handleStripeWebhook(
        rawBody,
        `t=${currentTime},v1=${sig}`,
      );

      expect(result.success).toBe(true);
      expect(result.eventId).toBe('evt_stripe_valid_001');
      expect(result.event).toBe('payment_intent.succeeded');
    });
  });
});
