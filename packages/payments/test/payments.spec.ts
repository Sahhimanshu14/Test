import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createHmac } from 'crypto';
import {
  MockPaymentProvider,
  RazorpayProvider,
  StripeProvider,
  getPaymentProvider,
} from '../src';

describe('Payment Provider & Webhook Verification System (@cdsprep/payments)', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('MockPaymentProvider', () => {
    it('creates orders and verifies mock signatures in tests', async () => {
      const provider = new MockPaymentProvider();
      const order = await provider.createOrder({
        amountInSmallestUnit: 49900,
        currency: 'INR',
        receipt: 'rec_123',
      });

      expect(order.orderId).toContain('order_mock_');
      expect(order.amount).toBe(49900);
      expect(order.status).toBe('created');

      const isValid = provider.verifyPaymentSignature({
        orderId: order.orderId,
        paymentId: 'pay_123',
        signature: `mock_sig_${order.orderId}_pay_123`,
      });
      expect(isValid).toBe(true);

      const event = provider.parseWebhookEvent('{"event":"payment.captured"}');
      expect(event.event).toBe('payment.captured');
    });
  });

  describe('RazorpayProvider', () => {
    const keyId = 'rzp_test_1234567890';
    const keySecret = 'secret_test_abcdefgh12345678';
    const webhookSecret = 'whsec_rzp_9876543210';

    it('throws when initialized without credentials', () => {
      expect(() => new RazorpayProvider({ keyId: '', keySecret: '' })).toThrowError(
        /requires keyId/,
      );
    });

    it('creates order via Razorpay API with Basic Auth', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'order_EKwxwAgItmmXdp',
          amount: 50000,
          currency: 'INR',
          status: 'created',
        }),
      } as Response);

      const provider = new RazorpayProvider({ keyId, keySecret });
      const order = await provider.createOrder({
        amountInSmallestUnit: 50000,
        currency: 'INR',
        receipt: 'receipt#1',
      });

      expect(order.orderId).toBe('order_EKwxwAgItmmXdp');
      expect(order.amount).toBe(50000);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.razorpay.com/v1/orders',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: expect.stringContaining('Basic '),
          }),
        }),
      );
    });

    it('cryptographically verifies valid checkout payment signature', () => {
      const provider = new RazorpayProvider({ keyId, keySecret });
      const orderId = 'order_DAvKZ8eZv8v8';
      const paymentId = 'pay_29MoEsz4dOfQ';

      const signature = createHmac('sha256', keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      const isValid = provider.verifyPaymentSignature({
        orderId,
        paymentId,
        signature,
      });

      expect(isValid).toBe(true);
    });

    it('rejects tampered checkout payment signature', () => {
      const provider = new RazorpayProvider({ keyId, keySecret });
      const isValid = provider.verifyPaymentSignature({
        orderId: 'order_123',
        paymentId: 'pay_456',
        signature: 'tampered_or_invalid_signature_hex_digest_here_000000',
      });

      expect(isValid).toBe(false);
    });

    it('verifies valid incoming webhook payload signature', () => {
      const provider = new RazorpayProvider({ keyId, keySecret, webhookSecret });
      const rawBody = JSON.stringify({
        event: 'payment.captured',
        payload: { payment: { entity: { id: 'pay_999' } } },
      });

      const signature = createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      const isValid = provider.verifyWebhookSignature(rawBody, signature);
      expect(isValid).toBe(true);

      const parsedEvent = provider.parseWebhookEvent(rawBody, signature);
      expect(parsedEvent.event).toBe('payment.captured');
    });
  });

  describe('StripeProvider', () => {
    const secretKey = 'sk_test_51MzSampleStripeKey';
    const webhookSecret = 'whsec_stripe_test_secret_12345';

    it('throws when initialized without secretKey', () => {
      expect(() => new StripeProvider({ secretKey: '' })).toThrowError(/requires secretKey/);
    });

    it('creates payment intent via Stripe API', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'pi_3MtwBwLkdIwHu7ix28a3tqPa',
          amount: 2500,
          currency: 'inr',
          status: 'requires_payment_method',
          client_secret: 'pi_3Mtw_secret_xyz',
        }),
      } as Response);

      const provider = new StripeProvider({ secretKey });
      const order = await provider.createOrder({
        amountInSmallestUnit: 2500,
        currency: 'INR',
        receipt: 'rec_stripe_1',
      });

      expect(order.orderId).toBe('pi_3MtwBwLkdIwHu7ix28a3tqPa');
      expect(order.clientSecret).toBe('pi_3Mtw_secret_xyz');
    });

    it('verifies Stripe webhook signature with valid timestamp', () => {
      const provider = new StripeProvider({ secretKey, webhookSecret });
      const rawBody = JSON.stringify({
        id: 'evt_123',
        type: 'payment_intent.succeeded',
      });

      const currentTimestamp = Math.floor(Date.now() / 1000);
      const signaturePayload = `${currentTimestamp}.${rawBody}`;
      const signature = createHmac('sha256', webhookSecret)
        .update(signaturePayload)
        .digest('hex');

      const header = `t=${currentTimestamp},v1=${signature}`;
      const isValid = provider.verifyWebhookSignature(rawBody, header);
      expect(isValid).toBe(true);

      const event = provider.parseWebhookEvent(rawBody, header);
      expect(event.event).toBe('payment_intent.succeeded');
    });

    it('rejects expired Stripe webhook signatures to prevent replay attacks', () => {
      const provider = new StripeProvider({ secretKey, webhookSecret });
      const rawBody = JSON.stringify({ id: 'evt_old' });

      // 10 minutes ago (600 seconds > 300 second threshold)
      const oldTimestamp = Math.floor(Date.now() / 1000) - 600;
      const signaturePayload = `${oldTimestamp}.${rawBody}`;
      const signature = createHmac('sha256', webhookSecret)
        .update(signaturePayload)
        .digest('hex');

      const header = `t=${oldTimestamp},v1=${signature}`;
      const isValid = provider.verifyWebhookSignature(rawBody, header);
      expect(isValid).toBe(false);
    });
  });

  describe('getPaymentProvider Factory', () => {
    it('returns MockPaymentProvider by default', () => {
      const provider = getPaymentProvider();
      expect(provider.providerName).toBe('mock');
    });

    it('instantiates RazorpayProvider when valid config provided', () => {
      const provider = getPaymentProvider({
        provider: 'razorpay',
        razorpayConfig: { keyId: 'key', keySecret: 'secret' },
      });
      expect(provider.providerName).toBe('razorpay');
    });

    it('fails fast if real provider requested without keys', () => {
      expect(() => getPaymentProvider({ provider: 'razorpay' })).toThrowError(/keyId/);
      expect(() => getPaymentProvider({ provider: 'stripe' })).toThrowError(/secretKey/);
    });
  });
});
