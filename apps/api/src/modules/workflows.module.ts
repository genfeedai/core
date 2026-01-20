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
    MongooseModule.forFeatureAsync([
      {
        name: Workflow.name,
        useFactory: () => {
          const schema = WorkflowSchema;
          schema.index({ isReusable: 1, isDeleted: 1 });
          schema.index({ name: 'text', description: 'text' });
          return schema;
        },
      },
    ]),
    CostModule,
  ],
  controllers: [WorkflowsController],
  providers: [WorkflowsService, WorkflowGeneratorService, WorkflowInterfaceService],
  exports: [WorkflowsService, WorkflowInterfaceService],
})
export class WorkflowsModule {}
