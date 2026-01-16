import { forwardRef, Module } from '@nestjs/common';
import { CostModule } from '../cost/cost.module';
import { ExecutionsModule } from '../executions/executions.module';
import { WorkflowsModule } from '../workflows/workflows.module';
import { ReplicateController } from './replicate.controller';
import { ReplicateService } from './replicate.service';

@Module({
  imports: [forwardRef(() => ExecutionsModule), forwardRef(() => WorkflowsModule), CostModule],
  controllers: [ReplicateController],
  providers: [ReplicateService],
  exports: [ReplicateService],
})
export class ReplicateModule {}
