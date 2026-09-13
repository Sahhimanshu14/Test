import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { ZodSchema } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const errorMap: Record<string, string[]> = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join('.') || 'root';
        if (!errorMap[path]) {
          errorMap[path] = [];
        }
        errorMap[path].push(issue.message);
      }
      throw new BadRequestException({
        message: 'Input validation failed',
        errors: errorMap,
      });
    }
    return result.data;
  }
}
