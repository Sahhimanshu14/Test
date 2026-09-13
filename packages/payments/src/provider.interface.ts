export interface CreateOrderOptions {
  amountInSmallestUnit: number; // e.g. 49900 for INR 499.00 or USD $499.00
  currency: string; // 'INR', 'USD'
  receipt: string;
  notes?: Record<string, string>;
}

export interface OrderResult {
  orderId: string;
  amount: number;
  currency: string;
  status: string;
  keyId?: string;
  clientSecret?: string;
}

export interface VerifyPaymentOptions {
  orderId: string;
  paymentId: string;
  signature: string;
}

export interface WebhookEvent<T = Record<string, unknown>> {
  id: string;
  event: string;
  payload: T;
  createdAt: Date;
}

export interface PaymentProvider {
  readonly providerName: string;
  createOrder(options: CreateOrderOptions): Promise<OrderResult>;
  verifyPaymentSignature(options: VerifyPaymentOptions): boolean;
  verifyWebhookSignature(rawBody: string | Buffer, signature: string, secret?: string): boolean;
  parseWebhookEvent(rawBody: string | Buffer, signature: string): WebhookEvent;
}
