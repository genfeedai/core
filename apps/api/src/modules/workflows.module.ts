import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WorkflowsController } from '@/controllers/workflows.controller';
import { CostModule } from '@/modules/cost.module';
import { Workflow, WorkflowSchema } from '@/schemas/workflow.schema';
import { WorkflowGeneratorService } from '@/services/workflow-generator.service';
import { WorkflowInterfaceService } from '@/services/workflow-interface.service';
import { WorkflowsService } from '@/services/workflows.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Workflow.name, schema: WorkflowSchema }]),
    CostModule,
  ],
  controllers: [WorkflowsController],
  providers: [WorkflowsService, WorkflowGeneratorService, WorkflowInterfaceService],
  exports: [WorkflowsService, WorkflowInterfaceService],
})
export class WorkflowsModule {}
