import {
  PaymentProvider,
  CreateOrderOptions,
  OrderResult,
  VerifyPaymentOptions,
  WebhookEvent,
} from './provider.interface';

export class MockPaymentProvider implements PaymentProvider {
  readonly providerName = 'mock';
  public orders: OrderResult[] = [];

  async createOrder(options: CreateOrderOptions): Promise<OrderResult> {
    const order: OrderResult = {
      orderId: `order_mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      amount: options.amountInSmallestUnit,
      currency: options.currency || 'INR',
      status: 'created',
      keyId: 'mock_key_id',
    };
    this.orders.push(order);
    return order;
  }

  verifyPaymentSignature(options: VerifyPaymentOptions): boolean {
    if (!options.signature || !options.orderId || !options.paymentId) {
      return false;
    }
    // In mock mode, any non-empty signature or matching mock pattern is valid
    return options.signature === `mock_sig_${options.orderId}_${options.paymentId}` || options.signature.length > 5;
  }

  verifyWebhookSignature(rawBody: string | Buffer, signature: string): boolean {
    return Boolean(signature && signature.length > 0);
  }

  parseWebhookEvent(rawBody: string | Buffer): WebhookEvent {
    const text = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf-8');
    try {
      const parsed = JSON.parse(text);
      return {
        id: parsed.id || `evt_mock_${Date.now()}`,
        event: parsed.event || 'payment.captured',
        payload: parsed.payload || parsed,
        createdAt: new Date(),
      };
    } catch {
      return {
        id: `evt_mock_${Date.now()}`,
        event: 'payment.captured',
        payload: { raw: text },
        createdAt: new Date(),
      };
    }
  }

  clear(): void {
    this.orders = [];
  }
}
