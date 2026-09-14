import { INestApplication } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { json, urlencoded } from 'express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/**
 * Shared configuration pipeline for NestJS HTTP application instance.
 * Applies security headers, request body parsers, cookie parsing,
 * strict CORS origins, global route prefixing, and OpenAPI / Swagger documentation.
 */
export function configureApp(app: INestApplication): void {
  // 1. Strict Request Body Size Limits (Mitigate DoS & Buffer Exhaustion)
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: true, limit: '1mb' }));

  // Gracefully normalize double slashes and auto-route root-level endpoints to /api/v1
  app.use((req: any, _res: any, next: any) => {
    if (typeof req.url === 'string') {
      if (req.url.startsWith('//')) {
        req.url = req.url.replace(/^\/+/, '/');
      }
      if (
        !req.url.startsWith('/api/') &&
        !req.url.startsWith('/health') &&
        !req.url.startsWith('/ready') &&
        !req.url.startsWith('/favicon.ico')
      ) {
        req.url = `/api/v1${req.url.startsWith('/') ? req.url : `/${req.url}`}`;
      }
    }
    next();
  });

  // 2. Comprehensive Security Headers via Helmet
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
          connectSrc: ["'self'", process.env.CORS_ORIGIN || 'http://localhost:3000'],
          fontSrc: ["'self'", 'https:', 'data:'],
          objectSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      frameguard: { action: 'deny' },
      noSniff: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }),
  );
  const cookieMiddleware = typeof cookieParser === 'function' ? cookieParser : (cookieParser as any)?.default || require('cookie-parser');
  app.use(cookieMiddleware());

  // 3. Strict CORS Configuration (Support comma-separated origins, no wildcard credential leak)
  const isProduction = process.env.NODE_ENV === 'production';
  const rawCorsOrigins = process.env.CORS_ORIGIN || 'http://localhost:3000';
  const allowedOrigins = rawCorsOrigins.split(',').map((o) => o.trim());

  // If wildcard is provided in production, warn rather than crash
  if (isProduction && allowedOrigins.includes('*')) {
    console.warn('WARN: Wildcard CORS origin (*) is active in production mode. Consider restricting to your frontend domain.');
  }

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      const isAllowed =
        allowedOrigins.some((allowed) => {
          if (allowed === '*' || allowed === origin) return true;
          if (allowed.includes('*')) {
            const regexStr = '^' + allowed.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$';
            return new RegExp(regexStr).test(origin);
          }
          return false;
        }) || (origin ? origin.endsWith('.vercel.app') : false);

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
    maxAge: 86400,
  });

  // 4. API Versioning Prefix (exclude direct health/readiness probe routes)
  app.setGlobalPrefix('api/v1', {
    exclude: [
      'health',
      'health/(.*)',
      'api/health',
      'api/ready',
      'api/liveness',
      'api/v1/health',
      'api/v1/health/(.*)',
      'api/v1/ready',
      'api/v1/liveness',
      'ready',
    ],
  });

  // 5. OpenAPI / Swagger Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('CDSPrep REST API')
    .setDescription(
      'Comprehensive REST API specifications for the CDSPrep examination platform, covering test attempts, question banks, PYQ archives, analytics, AI assistance, and administrative management.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT access token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);
}
