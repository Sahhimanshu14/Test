import { PaymentProvider } from './provider.interface';
import { MockPaymentProvider } from './mock-provider';
import { RazorpayProvider, RazorpayConfig } from './razorpay-provider';
import { StripeProvider, StripeConfig } from './stripe-provider';

export interface PaymentFactoryConfig {
  provider?: 'razorpay' | 'stripe' | 'mock' | string;
  razorpayConfig?: RazorpayConfig;
  stripeConfig?: StripeConfig;
}

export function getPaymentProvider(config?: PaymentFactoryConfig): PaymentProvider {
  const providerType = (config?.provider || 'mock').toLowerCase();

  switch (providerType) {
    case 'razorpay': {
      if (!config?.razorpayConfig?.keyId || !config?.razorpayConfig?.keySecret) {
        throw new Error('Razorpay payment provider requires keyId and keySecret');
      }
      return new RazorpayProvider(config.razorpayConfig);
    }

    case 'stripe': {
      if (!config?.stripeConfig?.secretKey) {
        throw new Error('Stripe payment provider requires secretKey');
      }
      return new StripeProvider(config.stripeConfig);
    }

    case 'mock':
    default:
      return new MockPaymentProvider();
  }
}
