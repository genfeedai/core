import { forwardRef, Module } from '@nestjs/common';
import { ReplicateController } from '@/controllers/replicate.controller';
import { CostModule } from '@/modules/cost.module';
import { ExecutionsModule } from '@/modules/executions.module';
import { QueueModule } from '@/modules/queue.module';
import { WorkflowsModule } from '@/modules/workflows.module';
import { ReplicateService } from '@/services/replicate.service';
import { ReplicatePollerService } from '@/services/replicate-poller.service';

@Module({
  imports: [
    forwardRef(() => ExecutionsModule),
    forwardRef(() => WorkflowsModule),
    forwardRef(() => QueueModule),
    CostModule,
  ],
  controllers: [ReplicateController],
  providers: [ReplicateService, ReplicatePollerService],
  exports: [ReplicateService, ReplicatePollerService],
})
export class ReplicateModule {}
