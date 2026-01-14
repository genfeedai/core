import { Injectable, NotFoundException, OnModuleInit } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Template, TemplateDocument } from "./schemas/template.schema";
import { CreateTemplateDto } from "./dto/create-template.dto";
import { SYSTEM_TEMPLATES } from "./templates.seed";

@Injectable()
export class TemplatesService implements OnModuleInit {
  constructor(
    @InjectModel(Template.name) private templateModel: Model<TemplateDocument>,
  ) {}

  async onModuleInit() {
    // Seed system templates on startup
    await this.seedSystemTemplates();
  }

  async seedSystemTemplates(): Promise<void> {
    for (const template of SYSTEM_TEMPLATES) {
      const existing = await this.templateModel
        .findOne({ name: template.name, isSystem: true })
        .exec();

      if (!existing) {
        await this.templateModel.create({
          ...template,
          isSystem: true,
        });
        console.log(`Seeded template: ${template.name}`);
      }
    }
  }

  async create(createTemplateDto: CreateTemplateDto): Promise<Template> {
    const template = new this.templateModel({
      ...createTemplateDto,
      nodes: createTemplateDto.nodes ?? [],
      edges: createTemplateDto.edges ?? [],
    });
    return template.save();
  }

  async findAll(category?: string): Promise<Template[]> {
    const query: Record<string, unknown> = { isDeleted: false };
    if (category && category !== "all") {
      query.category = category;
    }
    return this.templateModel.find(query).sort({ isSystem: -1, name: 1 }).exec();
  }

  async findOne(id: string): Promise<Template> {
    const template = await this.templateModel
      .findOne({ _id: id, isDeleted: false })
      .exec();

    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    return template;
  }

  async update(id: string, updateTemplateDto: Partial<CreateTemplateDto>): Promise<Template> {
    const template = await this.templateModel
      .findOneAndUpdate(
        { _id: id, isDeleted: false },
        { $set: updateTemplateDto },
        { new: true },
      )
      .exec();

    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    return template;
  }

  async remove(id: string): Promise<Template> {
    const template = await this.templateModel
      .findOneAndUpdate(
        { _id: id, isDeleted: false },
        { $set: { isDeleted: true } },
        { new: true },
      )
      .exec();

    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    return template;
  }
}
