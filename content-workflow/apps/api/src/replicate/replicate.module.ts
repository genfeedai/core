import { Module } from "@nestjs/common";
import { ReplicateController } from "./replicate.controller";
import { ReplicateService } from "./replicate.service";
import { ExecutionsModule } from "../executions/executions.module";

@Module({
  imports: [ExecutionsModule],
  controllers: [ReplicateController],
  providers: [ReplicateService],
  exports: [ReplicateService],
})
export class ReplicateModule {}
