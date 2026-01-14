import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ExecutionsController } from "./executions.controller";
import { ExecutionsService } from "./executions.service";
import { Execution, ExecutionSchema } from "./schemas/execution.schema";
import { Job, JobSchema } from "./schemas/job.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Execution.name, schema: ExecutionSchema },
      { name: Job.name, schema: JobSchema },
    ]),
  ],
  controllers: [ExecutionsController],
  providers: [ExecutionsService],
  exports: [ExecutionsService],
})
export class ExecutionsModule {}
