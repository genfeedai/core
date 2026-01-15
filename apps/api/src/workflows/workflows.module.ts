import { Module } from '@nestjs/common';
import { CostModule } from '../cost/cost.module';
import { WorkflowGeneratorService } from './workflow-generator.service';
import { WorkflowsController } from './workflows.controller';
import { WorkflowsService } from './workflows.service';

@Module({
  imports: [CostModule],
  controllers: [WorkflowsController],
  providers: [WorkflowsService, WorkflowGeneratorService],
  exports: [WorkflowsService],
})
export class WorkflowsModule {}
