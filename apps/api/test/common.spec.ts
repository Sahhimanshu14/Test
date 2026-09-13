import { describe, it, expect } from 'vitest';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, lastValueFrom } from 'rxjs';

describe('TransformInterceptor', () => {
  it('wraps raw response into standard ApiResponse envelope', async () => {
    const interceptor = new TransformInterceptor();
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { 'x-request-id': 'test-uuid-123' },
        }),
      }),
    } as unknown as ExecutionContext;

    const mockCallHandler: CallHandler = {
      handle: () => of({ test: 'data' }),
    };

    const observable = interceptor.intercept(mockContext, mockCallHandler);
    const result = await lastValueFrom(observable);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ test: 'data' });
    expect(result.meta?.requestId).toBe('test-uuid-123');
    expect(result.meta?.timestamp).toBeDefined();
  });
});
