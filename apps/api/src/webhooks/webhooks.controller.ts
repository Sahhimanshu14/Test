import {
  Controller,
  Post,
  Headers,
  Body,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { WebhooksService } from './webhooks.service';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Public()
  @Post('razorpay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ingest and cryptographically verify Razorpay webhook events' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid HMAC-SHA256 signature' })
  async handleRazorpayWebhook(
    @Headers('x-razorpay-signature') signature: string,
    @Body() body: Record<string, unknown>,
    @Req() req: Request,
  ) {
    // If rawBody was preserved on the request by bodyParser/middleware, use it; otherwise stringify
    const rawBody = (req as unknown as { rawBody?: Buffer }).rawBody || JSON.stringify(body);
    return this.webhooksService.handleRazorpayWebhook(rawBody, signature);
  }

  @Public()
  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ingest and cryptographically verify Stripe webhook events' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired signature' })
  async handleStripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Body() body: Record<string, unknown>,
    @Req() req: Request,
  ) {
    const rawBody = (req as unknown as { rawBody?: Buffer }).rawBody || JSON.stringify(body);
    return this.webhooksService.handleStripeWebhook(rawBody, signature);
  }
}
