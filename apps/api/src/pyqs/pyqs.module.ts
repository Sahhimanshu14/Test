import { Module } from '@nestjs/common';
import { PyqsService } from './pyqs.service';
import { PyqsController } from './pyqs.controller';
import { AttemptsModule } from '../attempts/attempts.module';

@Module({
  imports: [AttemptsModule],
  controllers: [PyqsController],
  providers: [PyqsService],
  exports: [PyqsService],
})
export class PyqsModule {}
