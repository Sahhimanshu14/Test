import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UsePipes,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PracticeService } from './practice.service';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import {
  CreatePracticeSessionDto,
  SubmitPracticeAnswerDto,
  CreateQuestionReportDto,
  PracticeHistoryQueryDto,
} from './dto/practice.dto';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  CreatePracticeSessionSchema,
  SubmitPracticeAnswerSchema,
  CreateQuestionReportSchema,
} from '@cdsprep/validation';

@ApiTags('Practice Engine')
@ApiBearerAuth()
@Controller('practice')
export class PracticeController {
  constructor(private readonly practiceService: PracticeService) {}

  @Post('sessions')
  @ApiOperation({ summary: 'Initialize and start a new practice session' })
  @ApiResponse({ status: 201, description: 'Practice session started with questions' })
  @UsePipes(new ZodValidationPipe(CreatePracticeSessionSchema))
  async createSession(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePracticeSessionDto,
  ) {
    return this.practiceService.createSession(user.id, dto);
  }

  @Get('sessions/:id')
  @ApiOperation({ summary: 'Get current practice session and answers' })
  @ApiResponse({ status: 200, description: 'Practice session returned' })
  async getSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') sessionId: string,
  ) {
    return this.practiceService.getSession(user.id, sessionId);
  }

  @Post('sessions/:id/answer')
  @ApiOperation({ summary: 'Submit or clear an answer authoritatively on the backend' })
  @ApiResponse({ status: 200, description: 'Answer evaluated and saved' })
  @UsePipes(new ZodValidationPipe(SubmitPracticeAnswerSchema))
  async submitAnswer(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') sessionId: string,
    @Body() dto: SubmitPracticeAnswerDto,
  ) {
    return this.practiceService.submitAnswer(user.id, sessionId, dto);
  }

  @Post('sessions/:id/complete')
  @ApiOperation({ summary: 'Complete practice session and calculate authoritative scores' })
  @ApiResponse({ status: 200, description: 'Practice session completed and scored' })
  async completeSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') sessionId: string,
  ) {
    return this.practiceService.completeSession(user.id, sessionId);
  }

  @Post('questions/:id/report')
  @ApiOperation({ summary: 'Report an issue or error for a question' })
  @ApiResponse({ status: 201, description: 'Report logged for review' })
  @UsePipes(new ZodValidationPipe(CreateQuestionReportSchema))
  async reportQuestion(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') questionId: string,
    @Body() dto: { reason: string; details?: string },
  ) {
    return this.practiceService.reportQuestion(user.id, {
      questionId,
      reason: dto.reason,
      details: dto.details,
    });
  }

  @Get('history')
  @ApiOperation({ summary: 'Retrieve student practice history with pagination' })
  @ApiResponse({ status: 200, description: 'Paginated list of past practice sessions' })
  async getHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PracticeHistoryQueryDto,
  ) {
    return this.practiceService.getHistory(user.id, query);
  }
}
