import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import type { CreateTemplateDto } from '@/dto/create-template.dto';
import { TemplatesService } from '@/services/templates.service';

@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Post()
  create(@Body() createTemplateDto: CreateTemplateDto) {
    return this.templatesService.create(createTemplateDto);
  }

  @Get()
  findAll(@Query('category') category?: string, @Query('search') search?: string) {
    return this.templatesService.findAll({ category, search });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.templatesService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateTemplateDto: Partial<CreateTemplateDto>) {
    return this.templatesService.update(id, updateTemplateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.templatesService.remove(id);
  }

  @Post('seed')
  async seed() {
    await this.templatesService.seedSystemTemplates();
    return { message: 'System templates seeded successfully' };
  }
}
