import {
  Controller,
  Get,
  Post,
  Body,
  Param,
} from "@nestjs/common";
import { ExecutionsService } from "./executions.service";

@Controller()
export class ExecutionsController {
  constructor(private readonly executionsService: ExecutionsService) {}

  @Post("workflows/:workflowId/execute")
  createExecution(@Param("workflowId") workflowId: string) {
    return this.executionsService.createExecution(workflowId);
  }

  @Get("workflows/:workflowId/executions")
  findByWorkflow(@Param("workflowId") workflowId: string) {
    return this.executionsService.findExecutionsByWorkflow(workflowId);
  }

  @Get("executions/:id")
  findOne(@Param("id") id: string) {
    return this.executionsService.findExecution(id);
  }

  @Post("executions/:id/stop")
  stopExecution(@Param("id") id: string) {
    return this.executionsService.updateExecutionStatus(id, "cancelled");
  }

  @Get("executions/:executionId/jobs")
  findJobsByExecution(@Param("executionId") executionId: string) {
    return this.executionsService.findJobsByExecution(executionId);
  }

  @Get("jobs/:predictionId")
  findJobByPredictionId(@Param("predictionId") predictionId: string) {
    return this.executionsService.findJobByPredictionId(predictionId);
  }

  @Post("jobs/:predictionId/update")
  updateJob(
    @Param("predictionId") predictionId: string,
    @Body() updates: { status?: string; progress?: number; output?: Record<string, unknown>; error?: string },
  ) {
    return this.executionsService.updateJob(predictionId, updates);
  }
}
