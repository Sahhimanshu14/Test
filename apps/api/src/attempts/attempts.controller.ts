import { Controller, Post, Put, Get, Body, Param, UsePipes } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import { AttemptsService } from './attempts.service';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  createAttemptSchema,
  autosaveAnswerSchema,
  submitAttemptSchema,
  logIntegrityEventSchema,
  CreateAttemptInput,
  AutosaveAnswerInput,
  SubmitAttemptInput,
  LogIntegrityEventInput,
} from '@cdsprep/validation';

@ApiTags('Test Attempts Engine')
@Controller('attempts')
export class AttemptsController {
  constructor(private readonly attemptsService: AttemptsService) {}

  @Post('start')
  @UsePipes(new ZodValidationPipe(createAttemptSchema))
  @ApiOperation({ summary: 'Initiate or resume a server-authoritative test attempt' })
  @SwaggerResponse({ status: 201, description: 'Attempt session established' })
  async startAttempt(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateAttemptInput) {
    return this.attemptsService.startAttempt(user.id, dto.testId, dto.sessionToken);
  }

  @Put(':id/autosave')
  @UsePipes(new ZodValidationPipe(autosaveAnswerSchema))
  @ApiOperation({ summary: 'Autosave question response and update palette state' })
  @SwaggerResponse({ status: 200, description: 'Response incrementally synchronized' })
  async autosave(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AutosaveAnswerInput,
  ) {
    return this.attemptsService.autosave(user.id, id, dto);
  }

  @Post(':id/submit')
  @UsePipes(new ZodValidationPipe(submitAttemptSchema))
  @ApiOperation({ summary: 'Finalize and submit examination attempt with idempotency' })
  @SwaggerResponse({ status: 200, description: 'Test evaluated and result generated' })
  async submit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SubmitAttemptInput,
  ) {
    return this.attemptsService.submit(user.id, id, dto);
  }

  @Post(':id/integrity-event')
  @UsePipes(new ZodValidationPipe(logIntegrityEventSchema))
  @ApiOperation({ summary: 'Log behavioral anti-tampering integrity event' })
  @SwaggerResponse({ status: 200, description: 'Integrity telemetry recorded' })
  async logIntegrityEvent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: LogIntegrityEventInput,
  ) {
    return this.attemptsService.logIntegrityEvent(user.id, id, dto);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel or abandon active attempt' })
  @SwaggerResponse({ status: 200, description: 'Attempt cancelled' })
  async cancelAttempt(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.attemptsService.cancelAttempt(user.id, id);
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'Get live status and question states for an attempt' })
  @SwaggerResponse({ status: 200, description: 'Attempt status retrieved' })
  async getStatus(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.attemptsService.getAttemptStatus(user.id, id);
  }
}
