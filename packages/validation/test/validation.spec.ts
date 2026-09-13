import { describe, it, expect } from 'vitest';
import {
  registerSchema,
  loginSchema,
  passwordResetRequestSchema,
  passwordResetConfirmSchema,
  verifyEmailSchema,
  changePasswordSchema,
  refreshTokenSchema,
} from '../src/auth';
import {
  CreatePracticeSessionSchema,
  SubmitPracticeAnswerSchema,
  CreateQuestionReportSchema,
} from '../src/practice';
import { registerUploadSchema } from '../src/file';
import { AcademyTarget, PracticeMode, DifficultyLevel } from '@cdsprep/types';

describe('Validation Schemas Suite', () => {
  describe('Auth Validation Schemas', () => {
    describe('registerSchema', () => {
      it('validates a valid registration payload', () => {
        const payload = {
          email: 'cadet.sharma@example.com',
          password: 'Password123!',
          fullName: 'Vikram Sharma',
          targetAcademy: AcademyTarget.IMA,
        };
        const result = registerSchema.safeParse(payload);
        expect(result.success).toBe(true);
      });

      it('fails when email format is invalid', () => {
        const payload = {
          email: 'not-an-email',
          password: 'Password123!',
          fullName: 'Vikram Sharma',
        };
        const result = registerSchema.safeParse(payload);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.some((i) => i.path.includes('email'))).toBe(true);
        }
      });

      it('fails when password is too short (<8 chars)', () => {
        const payload = {
          email: 'cadet@example.com',
          password: 'Pass1',
          fullName: 'Vikram Sharma',
        };
        const result = registerSchema.safeParse(payload);
        expect(result.success).toBe(false);
      });

      it('fails when password lacks uppercase or number', () => {
        const noUpper = registerSchema.safeParse({
          email: 'cadet@example.com',
          password: 'password123',
          fullName: 'Vikram Sharma',
        });
        expect(noUpper.success).toBe(false);

        const noNumber = registerSchema.safeParse({
          email: 'cadet@example.com',
          password: 'PasswordOnly',
          fullName: 'Vikram Sharma',
        });
        expect(noNumber.success).toBe(false);
      });

      it('fails when fullName is shorter than 2 characters', () => {
        const result = registerSchema.safeParse({
          email: 'cadet@example.com',
          password: 'Password123',
          fullName: 'V',
        });
        expect(result.success).toBe(false);
      });

      it('defaults targetAcademy to IMA when omitted', () => {
        const payload = {
          email: 'cadet@example.com',
          password: 'Password123!',
          fullName: 'Vikram Sharma',
        };
        const result = registerSchema.safeParse(payload);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.targetAcademy).toBe(AcademyTarget.IMA);
        }
      });
    });

    describe('loginSchema', () => {
      it('validates a valid login payload', () => {
        const result = loginSchema.safeParse({
          email: 'cadet@example.com',
          password: 'Password123',
        });
        expect(result.success).toBe(true);
      });

      it('rejects empty password or invalid email', () => {
        expect(loginSchema.safeParse({ email: 'cadet@example.com', password: '' }).success).toBe(false);
        expect(loginSchema.safeParse({ email: 'cadet', password: 'Pass' }).success).toBe(false);
      });
    });

    describe('passwordResetRequestSchema & passwordResetConfirmSchema', () => {
      it('validates password reset request', () => {
        expect(passwordResetRequestSchema.safeParse({ email: 'user@example.com' }).success).toBe(true);
        expect(passwordResetRequestSchema.safeParse({ email: 'invalid' }).success).toBe(false);
      });

      it('validates password reset confirm with valid token & secure password', () => {
        const result = passwordResetConfirmSchema.safeParse({
          token: 'secure-reset-token-12345',
          newPassword: 'NewSecurePassword123',
        });
        expect(result.success).toBe(true);
      });

      it('rejects empty token or weak newPassword', () => {
        expect(
          passwordResetConfirmSchema.safeParse({
            token: '',
            newPassword: 'NewSecurePassword123',
          }).success,
        ).toBe(false);

        expect(
          passwordResetConfirmSchema.safeParse({
            token: 'token-123',
            newPassword: 'weak',
          }).success,
        ).toBe(false);
      });
    });

    describe('verifyEmailSchema & changePasswordSchema & refreshTokenSchema', () => {
      it('validates verifyEmailSchema requires non-empty token', () => {
        expect(verifyEmailSchema.safeParse({ token: 'tok_abc123' }).success).toBe(true);
        expect(verifyEmailSchema.safeParse({ token: '' }).success).toBe(false);
      });

      it('validates changePasswordSchema requires current and compliant new password', () => {
        expect(
          changePasswordSchema.safeParse({
            currentPassword: 'OldPassword123',
            newPassword: 'NewPassword123',
          }).success,
        ).toBe(true);

        expect(
          changePasswordSchema.safeParse({
            currentPassword: '',
            newPassword: 'NewPassword123',
          }).success,
        ).toBe(false);
      });

      it('validates refreshTokenSchema works with token and allows optional', () => {
        expect(refreshTokenSchema.safeParse({ refreshToken: 'ref-token-xyz' }).success).toBe(true);
        expect(refreshTokenSchema.safeParse({}).success).toBe(true);
        expect(refreshTokenSchema.safeParse({ refreshToken: '' }).success).toBe(false);
      });
    });
  });

  describe('Practice Validation Schemas', () => {
    describe('CreatePracticeSessionSchema', () => {
      it('validates session configuration with valid defaults', () => {
        const result = CreatePracticeSessionSchema.safeParse({});
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.mode).toBe(PracticeMode.ALL_QUESTIONS);
          expect(result.data.questionCount).toBe(10);
          expect(result.data.randomize).toBe(true);
          expect(result.data.enableNegativeMarking).toBe(false);
        }
      });

      it('accepts valid UUID filters and custom parameters', () => {
        const validUuid = '123e4567-e89b-12d3-a456-426614174000';
        const result = CreatePracticeSessionSchema.safeParse({
          mode: PracticeMode.CHAPTER_WISE,
          subjectId: validUuid,
          chapterId: validUuid,
          topicId: validUuid,
          difficulty: DifficultyLevel.HARD,
          questionCount: 50,
          timeLimitMinutes: 60,
          enableNegativeMarking: true,
        });
        expect(result.success).toBe(true);
      });

      it('rejects invalid UUIDs', () => {
        const result = CreatePracticeSessionSchema.safeParse({
          subjectId: 'not-a-uuid',
        });
        expect(result.success).toBe(false);
      });

      it('enforces questionCount bounds [1, 100]', () => {
        expect(CreatePracticeSessionSchema.safeParse({ questionCount: 0 }).success).toBe(false);
        expect(CreatePracticeSessionSchema.safeParse({ questionCount: 1 }).success).toBe(true);
        expect(CreatePracticeSessionSchema.safeParse({ questionCount: 100 }).success).toBe(true);
        expect(CreatePracticeSessionSchema.safeParse({ questionCount: 101 }).success).toBe(false);
      });
    });

    describe('SubmitPracticeAnswerSchema', () => {
      const validQId = '123e4567-e89b-12d3-a456-426614174000';
      const validOptId = '223e4567-e89b-12d3-a456-426614174001';

      it('validates a correct answer submission', () => {
        const result = SubmitPracticeAnswerSchema.safeParse({
          questionId: validQId,
          selectedOptionId: validOptId,
          timeSpentSeconds: 45,
          isMarkedForReview: true,
        });
        expect(result.success).toBe(true);
      });

      it('allows nullable selectedOptionId (unanswered)', () => {
        const result = SubmitPracticeAnswerSchema.safeParse({
          questionId: validQId,
          selectedOptionId: null,
          timeSpentSeconds: 15,
        });
        expect(result.success).toBe(true);
      });

      it('rejects negative timeSpentSeconds', () => {
        const result = SubmitPracticeAnswerSchema.safeParse({
          questionId: validQId,
          timeSpentSeconds: -5,
        });
        expect(result.success).toBe(false);
      });
    });

    describe('CreateQuestionReportSchema', () => {
      const validQId = '123e4567-e89b-12d3-a456-426614174000';

      it('validates a valid question report', () => {
        const result = CreateQuestionReportSchema.safeParse({
          questionId: validQId,
          reason: 'Typo in option C',
          details: 'Should say 15 instead of 51',
        });
        expect(result.success).toBe(true);
      });

      it('rejects empty or single character reason', () => {
        const result = CreateQuestionReportSchema.safeParse({
          questionId: validQId,
          reason: 'A',
        });
        expect(result.success).toBe(false);
      });
    });
  });

  describe('File Upload Validation Schemas', () => {
    describe('registerUploadSchema', () => {
      it('accepts valid PDF and image uploads', () => {
        expect(
          registerUploadSchema.safeParse({
            originalName: 'cds_paper_2023.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 1024 * 1024 * 2, // 2MB
          }).success,
        ).toBe(true);

        expect(
          registerUploadSchema.safeParse({
            originalName: 'diagram.png',
            mimeType: 'image/png',
            sizeBytes: 500 * 1024,
          }).success,
        ).toBe(true);
      });

      it('rejects dangerous executable extensions', () => {
        expect(
          registerUploadSchema.safeParse({
            originalName: 'malware.exe',
            mimeType: 'application/pdf', // spoofed MIME
            sizeBytes: 1024,
          }).success,
        ).toBe(false);

        expect(
          registerUploadSchema.safeParse({
            originalName: 'script.sh',
            mimeType: 'image/jpeg',
            sizeBytes: 1024,
          }).success,
        ).toBe(false);
      });

      it('rejects files exceeding 10MB', () => {
        const result = registerUploadSchema.safeParse({
          originalName: 'huge_document.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 10 * 1024 * 1024 + 1,
        });
        expect(result.success).toBe(false);
      });

      it('rejects files with non-positive size', () => {
        expect(
          registerUploadSchema.safeParse({
            originalName: 'empty.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 0,
          }).success,
        ).toBe(false);
      });
    });
  });
});
