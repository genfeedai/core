import { forwardRef, Module } from '@nestjs/common';
import { ReplicateController } from '@/controllers/replicate.controller';
import { CostModule } from '@/modules/cost.module';
import { ExecutionsModule } from '@/modules/executions.module';
import { FilesModule } from '@/modules/files.module';
import { QueueModule } from '@/modules/queue.module';
import { WorkflowsModule } from '@/modules/workflows.module';
import { ReplicateService } from '@/services/replicate.service';
import { ReplicatePollerService } from '@/services/replicate-poller.service';
import { SchemaMapperService } from '@/services/schema-mapper.service';

@Module({
  controllers: [ReplicateController],
  exports: [ReplicateService, ReplicatePollerService, SchemaMapperService],
  imports: [
    forwardRef(() => ExecutionsModule),
    forwardRef(() => WorkflowsModule),
    forwardRef(() => QueueModule),
    CostModule,
    FilesModule,
  ],
  providers: [ReplicateService, ReplicatePollerService, SchemaMapperService],
})
export class ReplicateModule {}
