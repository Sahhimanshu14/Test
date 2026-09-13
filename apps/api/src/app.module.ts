import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { validateServerEnv } from '@cdsprep/validation';

// Core & Persistence
import { PrismaModule } from './prisma/prisma.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { CacheModule } from './common/cache/cache.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';

// 20 Domain Modules
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { SubjectsModule } from './subjects/subjects.module';
import { ChaptersModule } from './chapters/chapters.module';
import { TopicsModule } from './topics/topics.module';
import { QuestionsModule } from './questions/questions.module';
import { PyqsModule } from './pyqs/pyqs.module';
import { TestsModule } from './tests/tests.module';
import { AttemptsModule } from './attempts/attempts.module';
import { ResultsModule } from './results/results.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { BookmarksModule } from './bookmarks/bookmarks.module';
import { MistakesModule } from './mistakes/mistakes.module';
import { NotificationsModule } from './notifications/notifications.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { AiModule } from './ai/ai.module';
import { AdminModule } from './admin/admin.module';
import { AuditModule } from './audit/audit.module';
import { FilesModule } from './files/files.module';
import { PracticeModule } from './practice/practice.module';
import { SearchModule } from './search/search.module';
import { GamificationModule } from './gamification/gamification.module';
import { EmailModule } from './email/email.module';
import { WebhooksModule } from './webhooks/webhooks.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env', '../.env'],
      validate: validateServerEnv,
    }),

    // Rate Limiting (Default 100 requests per 60 seconds)
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),

    // Global Database Access
    PrismaModule,

    // Global Caching Layer
    CacheModule,

    // Domain Modules
    HealthModule,
    AuthModule,
    UsersModule,
    RolesModule,
    SubjectsModule,
    ChaptersModule,
    TopicsModule,
    QuestionsModule,
    PyqsModule,
    TestsModule,
    AttemptsModule,
    ResultsModule,
    AnalyticsModule,
    BookmarksModule,
    MistakesModule,
    NotificationsModule,
    LeaderboardModule,
    AiModule,
    AdminModule,
    AuditModule,
    FilesModule,
    PracticeModule,
    SearchModule,
    GamificationModule,
    EmailModule,
    WebhooksModule,
  ],
  providers: [
    // Request ID & Response Transform
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    // Structured Latency & Request Logging
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    // Global Exception Handling & Error Sanitization
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    // Global Throttler Guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Global JWT Auth Guard (Public endpoints bypassed via @Public())
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Global Roles Guard
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    // Global Permissions Guard
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
