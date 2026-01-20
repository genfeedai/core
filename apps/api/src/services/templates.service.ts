import { Injectable, Logger, NotFoundException, type OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import type { CreateTemplateDto } from '@/dto/create-template.dto';
import { Template, type TemplateDocument } from '@/schemas/template.schema';
import { SYSTEM_TEMPLATES } from '@/templates/templates.seed';

@Injectable()
export class TemplatesService implements OnModuleInit {
  private readonly logger = new Logger(TemplatesService.name);

  constructor(
    @InjectModel(Template.name)
    private readonly templateModel: Model<TemplateDocument>
  ) {}

  async onModuleInit() {
    await this.seedSystemTemplates();
  }

  async seedSystemTemplates(): Promise<void> {
    for (const template of SYSTEM_TEMPLATES) {
      const existing = await this.templateModel
        .findOne({ name: template.name, isSystem: true })
        .exec();

      if (existing) {
        await this.templateModel.updateOne({ _id: existing._id }, { $set: template }).exec();
      } else {
        await this.templateModel.create({ ...template, isSystem: true });
      }
      this.logger.log(`Seeded template: ${template.name}`);
    }
  }

  async create(dto: CreateTemplateDto): Promise<TemplateDocument> {
    const template = new this.templateModel({
      name: dto.name,
      description: dto.description ?? '',
      category: dto.category,
      nodes: dto.nodes ?? [],
      edges: dto.edges ?? [],
      thumbnail: dto.thumbnail,
    });
    return template.save();
  }

  async findAll(options?: { category?: string; search?: string }): Promise<TemplateDocument[]> {
    const filter: Record<string, unknown> = { isDeleted: false };
    if (options?.category && options.category !== 'all') {
      filter.category = options.category;
    }
    if (options?.search) {
      filter.$text = { $search: options.search };
    }
    return this.templateModel.find(filter).sort({ name: 1 }).exec();
  }

  async findOne(id: string): Promise<TemplateDocument> {
    const template = await this.templateModel.findOne({ _id: id, isDeleted: false }).exec();
    if (!template) {
      throw new NotFoundException(`Template ${id} not found`);
    }
    return template;
  }

  async update(id: string, dto: Partial<CreateTemplateDto>): Promise<TemplateDocument> {
    const template = await this.templateModel
      .findOneAndUpdate({ _id: id, isDeleted: false }, { $set: dto }, { new: true })
      .exec();
    if (!template) {
      throw new NotFoundException(`Template ${id} not found`);
    }
    return template;
  }

  async remove(id: string): Promise<TemplateDocument> {
    const template = await this.templateModel
      .findOneAndUpdate({ _id: id, isDeleted: false }, { $set: { isDeleted: true } }, { new: true })
      .exec();
    if (!template) {
      throw new NotFoundException(`Template ${id} not found`);
    }
    return template;
  }
}
