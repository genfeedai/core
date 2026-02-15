import { Injectable, Logger, NotFoundException, type OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import type { CreateTemplateDto } from '@/dto/create-template.dto';
import type { MongoFilterQuery } from '@/interfaces/execution-types.interface';
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
    let created = 0;
    let updated = 0;

    for (const template of SYSTEM_TEMPLATES) {
      const existing = await this.templateModel
        .findOne({ isSystem: true, name: template.name })
        .exec();

      if (existing) {
        await this.templateModel.updateOne({ _id: existing._id }, { $set: template }).exec();
        updated++;
      } else {
        await this.templateModel.create({ ...template, isSystem: true });
        created++;
      }
    }

    if (created > 0) {
      this.logger.log(`Seeded ${created} new template(s)`);
    }
    if (updated > 0) {
      this.logger.debug(`Updated ${updated} existing template(s)`);
    }
  }

  async create(dto: CreateTemplateDto): Promise<TemplateDocument> {
    const template = new this.templateModel({
      category: dto.category,
      description: dto.description ?? '',
      edges: dto.edges ?? [],
      name: dto.name,
      nodes: dto.nodes ?? [],
      thumbnail: dto.thumbnail,
    });
    return template.save();
  }

  async findAll(options?: { category?: string; search?: string }): Promise<TemplateDocument[]> {
    const filter: MongoFilterQuery = { isDeleted: false };
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
