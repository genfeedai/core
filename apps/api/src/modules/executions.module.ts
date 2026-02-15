import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ExecutionsController } from '@/controllers/executions.controller';
import { QueueModule } from '@/modules/queue.module';
import { Execution, ExecutionSchema } from '@/schemas/execution.schema';
import { Job, JobSchema } from '@/schemas/job.schema';
import { ExecutionsService } from '@/services/executions.service';

@Module({
  controllers: [ExecutionsController],
  exports: [ExecutionsService],
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: Execution.name,
        useFactory: () => {
          const schema = ExecutionSchema;
          schema.index({ isDeleted: 1, workflowId: 1 });
          schema.index({ createdAt: -1 });
          return schema;
        },
      },
      {
        name: Job.name,
        useFactory: () => {
          const schema = JobSchema;
          schema.index({ executionId: 1, status: 1 });
          return schema;
        },
      },
    ]),
    forwardRef(() => QueueModule),
  ],
  providers: [ExecutionsService],
})
export class ExecutionsModule {}
