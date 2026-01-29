import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import type { CreatePromptDto } from '@/dto/create-prompt.dto';
import type { QueryPromptsDto } from '@/dto/query-prompts.dto';
import { PromptsService } from '@/services/prompts.service';

@Controller('prompts')
export class PromptsController {
  constructor(private readonly promptsService: PromptsService) {}

  @Post()
  create(@Body() createDto: CreatePromptDto) {
    return this.promptsService.create(createDto);
  }

  @Get()
  findAll(@Query() query: QueryPromptsDto) {
    return this.promptsService.findAll(query);
  }

  @Get('featured')
  findFeatured(@Query('limit') limit?: number) {
    return this.promptsService.findFeatured(limit);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.promptsService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateDto: Partial<CreatePromptDto>) {
    return this.promptsService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.promptsService.remove(id);
  }

  @Post(':id/use')
  use(@Param('id') id: string) {
    return this.promptsService.incrementUseCount(id);
  }

  @Post(':id/duplicate')
  duplicate(@Param('id') id: string) {
    return this.promptsService.duplicate(id);
  }
}
