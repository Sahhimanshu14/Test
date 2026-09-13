import {
  Controller,
  Post,
  Body,
  Get,
  UsePipes,
  HttpCode,
  HttpStatus,
  Req,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse as SwaggerResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { Public } from '../common/decorators/public.decorator';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  registerSchema,
  loginSchema,
  passwordResetRequestSchema,
  passwordResetConfirmSchema,
  verifyEmailSchema,
  changePasswordSchema,
  refreshTokenSchema,
  RegisterInput,
  LoginInput,
  PasswordResetRequestInput,
  PasswordResetConfirmInput,
  VerifyEmailInput,
  ChangePasswordInput,
  RefreshTokenInput,
} from '@cdsprep/validation';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('register')
  @UsePipes(new ZodValidationPipe(registerSchema))
  @ApiOperation({ summary: 'Register a new student account' })
  @SwaggerResponse({ status: 201, description: 'Account registered successfully' })
  async register(@Body() dto: RegisterInput, @Req() req: Request) {
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    return this.authService.register(dto, ip);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(loginSchema))
  @ApiOperation({ summary: 'Authenticate with email and password' })
  @SwaggerResponse({ status: 200, description: 'Authentication successful' })
  async login(@Body() dto: LoginInput, @Req() req: Request) {
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    const userAgent = req.headers['user-agent'];
    return this.authService.login(dto, ip, userAgent);
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(refreshTokenSchema))
  @ApiOperation({ summary: 'Rotate and refresh access token' })
  @SwaggerResponse({ status: 200, description: 'Token refreshed' })
  async refresh(@Body() dto: RefreshTokenInput, @Req() req: Request) {
    const token = dto.refreshToken || (req.cookies && req.cookies['cdsprep_refresh_token']);
    if (!token) {
      throw new BadRequestException('Refresh token is required');
    }
    const ip = req.ip || (req.headers['x-forwarded-for'] as string) || '127.0.0.1';
    return this.authService.refreshToken(token, ip);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Revoke active refresh token and logout' })
  @SwaggerResponse({ status: 200, description: 'Logged out successfully' })
  async logout(@CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    const ip = req.ip || (req.headers['x-forwarded-for'] as string) || '127.0.0.1';
    return this.authService.logout(user.id, ip);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(passwordResetRequestSchema))
  @ApiOperation({ summary: 'Initiate password reset flow' })
  @SwaggerResponse({ status: 200, description: 'Reset link dispatched' })
  async forgotPassword(@Body() dto: PasswordResetRequestInput, @Req() req: Request) {
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    return this.authService.forgotPassword(dto, ip);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(passwordResetConfirmSchema))
  @ApiOperation({ summary: 'Reset password using token' })
  @SwaggerResponse({ status: 200, description: 'Password reset successfully' })
  async resetPassword(@Body() dto: PasswordResetConfirmInput, @Req() req: Request) {
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    return this.authService.resetPassword(dto, ip);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(verifyEmailSchema))
  @ApiOperation({ summary: 'Verify email using confirmation token' })
  @SwaggerResponse({ status: 200, description: 'Email verified' })
  async verifyEmail(@Body() dto: VerifyEmailInput) {
    return this.authService.verifyEmail(dto.token);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT')
  @UsePipes(new ZodValidationPipe(changePasswordSchema))
  @ApiOperation({ summary: 'Change password for authenticated user' })
  @SwaggerResponse({ status: 200, description: 'Password changed successfully' })
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordInput,
    @Req() req: Request,
  ) {
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    return this.authService.changePassword(user.id, dto, ip);
  }

  @Get('me')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @SwaggerResponse({ status: 200, description: 'User profile retrieved' })
  async me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getMe(user.id);
  }
}
