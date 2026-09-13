import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  PaymentProvider,
  getPaymentProvider,
  RazorpayProvider,
  StripeProvider,
  WebhookEvent,
} from '@cdsprep/payments';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);
  private readonly razorpayProvider: RazorpayProvider | null = null;
  private readonly stripeProvider: StripeProvider | null = null;
  private readonly defaultProvider: PaymentProvider;

  // In-memory idempotency cache (with TTL/LRU cleanup pattern)
  private readonly processedEvents = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {
    const providerName = process.env.PAYMENT_PROVIDER || 'mock';

    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
      this.razorpayProvider = new RazorpayProvider({
        keyId: process.env.RAZORPAY_KEY_ID,
        keySecret: process.env.RAZORPAY_KEY_SECRET,
        webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
      });
    }

    if (process.env.STRIPE_SECRET_KEY) {
      this.stripeProvider = new StripeProvider({
        secretKey: process.env.STRIPE_SECRET_KEY,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
      });
    }

    this.defaultProvider = getPaymentProvider({
      provider: providerName,
      razorpayConfig: this.razorpayProvider ? {
        keyId: process.env.RAZORPAY_KEY_ID!,
        keySecret: process.env.RAZORPAY_KEY_SECRET!,
        webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
      } : undefined,
      stripeConfig: this.stripeProvider ? {
        secretKey: process.env.STRIPE_SECRET_KEY!,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
      } : undefined,
    });
  }

  isEventProcessed(eventId: string): boolean {
    return this.processedEvents.has(eventId);
  }

  markEventProcessed(eventId: string): void {
    this.processedEvents.add(eventId);
    // Keep max 10,000 entries in memory
    if (this.processedEvents.size > 10000) {
      const first = this.processedEvents.values().next().value;
      if (first) this.processedEvents.delete(first);
    }
  }

  async handleRazorpayWebhook(rawBody: string | Buffer, signature?: string) {
    if (!signature) {
      throw new UnauthorizedException('Missing X-Razorpay-Signature header');
    }

    const provider = this.razorpayProvider || this.defaultProvider;

    let event: WebhookEvent;
    try {
      event = provider.parseWebhookEvent(rawBody, signature);
    } catch (err: unknown) {
      this.logger.warn(`Razorpay signature verification failed: ${(err as Error).message}`);
      throw new UnauthorizedException('Invalid webhook signature');
    }

    // Idempotency check: prevent replay attacks
    if (this.isEventProcessed(event.id)) {
      this.logger.log(`Duplicate Razorpay event ignored: ${event.id}`);
      return { status: 'already_processed', eventId: event.id };
    }

    this.markEventProcessed(event.id);

    // Audit log webhook ingestion
    await this.auditService.log({
      action: 'WEBHOOK_PAYMENT_PROCESSED',
      entityType: 'payment',
      entityId: event.id,
      metadata: {
        provider: 'razorpay',
        event: event.event,
        receivedAt: new Date().toISOString(),
      },
    });

    this.logger.log(`Processed Razorpay webhook event [${event.event}] (ID: ${event.id})`);

    return {
      success: true,
      eventId: event.id,
      event: event.event,
    };
  }

  async handleStripeWebhook(rawBody: string | Buffer, signatureHeader?: string) {
    if (!signatureHeader) {
      throw new UnauthorizedException('Missing Stripe-Signature header');
    }

    const provider = this.stripeProvider || this.defaultProvider;

    let event: WebhookEvent;
    try {
      event = provider.parseWebhookEvent(rawBody, signatureHeader);
    } catch (err: unknown) {
      this.logger.warn(`Stripe signature verification failed: ${(err as Error).message}`);
      throw new UnauthorizedException('Invalid or expired webhook signature');
    }

    if (this.isEventProcessed(event.id)) {
      this.logger.log(`Duplicate Stripe event ignored: ${event.id}`);
      return { status: 'already_processed', eventId: event.id };
    }

    this.markEventProcessed(event.id);

    await this.auditService.log({
      action: 'WEBHOOK_PAYMENT_PROCESSED',
      entityType: 'payment',
      entityId: event.id,
      metadata: {
        provider: 'stripe',
        event: event.event,
        receivedAt: new Date().toISOString(),
      },
    });

    this.logger.log(`Processed Stripe webhook event [${event.event}] (ID: ${event.id})`);

    return {
      success: true,
      eventId: event.id,
      event: event.event,
    };
  }
}
