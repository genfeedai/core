import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from "@nestjs/common";
import { TemplatesService } from "./templates.service";
import { CreateTemplateDto } from "./dto/create-template.dto";

@Controller("templates")
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Post()
  create(@Body() createTemplateDto: CreateTemplateDto) {
    return this.templatesService.create(createTemplateDto);
  }

  @Get()
  findAll(@Query("category") category?: string) {
    return this.templatesService.findAll(category);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.templatesService.findOne(id);
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() updateTemplateDto: Partial<CreateTemplateDto>) {
    return this.templatesService.update(id, updateTemplateDto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.templatesService.remove(id);
  }

  @Post("seed")
  async seed() {
    await this.templatesService.seedSystemTemplates();
    return { message: "System templates seeded successfully" };
  }
}
