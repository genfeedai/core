import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WorkflowsController } from '@/controllers/workflows.controller';
import { CostModule } from '@/modules/cost.module';
import { Workflow, WorkflowSchema } from '@/schemas/workflow.schema';
import { WorkflowGeneratorService } from '@/services/workflow-generator.service';
import { WorkflowInterfaceService } from '@/services/workflow-interface.service';
import { WorkflowsService } from '@/services/workflows.service';

@Module({
  controllers: [WorkflowsController],
  exports: [WorkflowsService, WorkflowInterfaceService],
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: Workflow.name,
        useFactory: () => {
          const schema = WorkflowSchema;
          schema.index({ isDeleted: 1, isReusable: 1 });
          schema.index({ description: 'text', name: 'text' });
          return schema;
        },
      },
    ]),
    CostModule,
  ],
  providers: [WorkflowsService, WorkflowGeneratorService, WorkflowInterfaceService],
})
export class WorkflowsModule {}
