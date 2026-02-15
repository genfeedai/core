import { Injectable, Logger, NotFoundException, type OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import type { CreatePromptDto } from '@/dto/create-prompt.dto';
import type { MongoFilterQuery } from '@/interfaces/execution-types.interface';
import type { QueryPromptsDto } from '@/dto/query-prompts.dto';
import { Prompt, type PromptDocument } from '@/schemas/prompt.schema';
import { SYSTEM_PROMPTS } from '@/templates/prompts.seed';

@Injectable()
export class PromptsService implements OnModuleInit {
  private readonly logger = new Logger(PromptsService.name);

  constructor(
    @InjectModel(Prompt.name)
    private readonly promptModel: Model<PromptDocument>
  ) {}

  async onModuleInit() {
    await this.seedSystemPrompts();
  }

  async seedSystemPrompts(): Promise<void> {
    let created = 0;
    let updated = 0;

    for (const prompt of SYSTEM_PROMPTS) {
      const existing = await this.promptModel.findOne({ isSystem: true, name: prompt.name }).exec();

      if (existing) {
        await this.promptModel.updateOne({ _id: existing._id }, { $set: prompt }).exec();
        updated++;
      } else {
        await this.promptModel.create({ ...prompt, isSystem: true });
        created++;
      }
    }

    if (created > 0) {
      this.logger.log(`Seeded ${created} new prompt(s)`);
    }
    if (updated > 0) {
      this.logger.debug(`Updated ${updated} existing prompt(s)`);
    }
  }

  async create(dto: CreatePromptDto): Promise<PromptDocument> {
    const prompt = new this.promptModel({
      aspectRatio: dto.aspectRatio,
      category: dto.category,
      description: dto.description ?? '',
      isFeatured: dto.isFeatured ?? false,
      name: dto.name,
      preferredModel: dto.preferredModel,
      promptText: dto.promptText,
      styleSettings: dto.styleSettings ?? {},
      tags: dto.tags ?? [],
      thumbnail: dto.thumbnail,
    });
    return prompt.save();
  }

  async findAll(query: QueryPromptsDto): Promise<PromptDocument[]> {
    const filter: MongoFilterQuery = { isDeleted: false };

    if (query.category) filter.category = query.category;
    if (query.tag) filter.tags = query.tag;
    if (query.search) {
      filter.$text = { $search: query.search };
    }

    const sortField = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;

    return this.promptModel
      .find(filter)
      .sort({ [sortField]: sortOrder })
      .skip(query.offset ?? 0)
      .limit(query.limit ?? 20)
      .exec();
  }

  async findFeatured(limit = 10): Promise<PromptDocument[]> {
    return this.promptModel
      .find({ isDeleted: false, isFeatured: true })
      .sort({ useCount: -1 })
      .limit(limit)
      .exec();
  }

  async findOne(id: string): Promise<PromptDocument> {
    const item = await this.promptModel.findOne({ _id: id, isDeleted: false }).exec();
    if (!item) {
      throw new NotFoundException(`Prompt library item ${id} not found`);
    }
    return item;
  }

  async update(id: string, dto: Partial<CreatePromptDto>): Promise<PromptDocument> {
    const item = await this.promptModel
      .findOneAndUpdate({ _id: id, isDeleted: false }, { $set: dto }, { new: true })
      .exec();
    if (!item) {
      throw new NotFoundException(`Prompt library item ${id} not found`);
    }
    return item;
  }

  async remove(id: string): Promise<PromptDocument> {
    const item = await this.promptModel
      .findOneAndUpdate({ _id: id, isDeleted: false }, { $set: { isDeleted: true } }, { new: true })
      .exec();
    if (!item) {
      throw new NotFoundException(`Prompt library item ${id} not found`);
    }
    return item;
  }

  async incrementUseCount(id: string): Promise<PromptDocument> {
    const item = await this.promptModel
      .findOneAndUpdate({ _id: id, isDeleted: false }, { $inc: { useCount: 1 } }, { new: true })
      .exec();
    if (!item) {
      throw new NotFoundException(`Prompt library item ${id} not found`);
    }
    return item;
  }

  async duplicate(id: string): Promise<PromptDocument> {
    const original = await this.findOne(id);
    const duplicate = new this.promptModel({
      aspectRatio: original.aspectRatio,
      category: original.category,
      description: original.description,
      isFeatured: false,
      name: `${original.name} (copy)`,
      preferredModel: original.preferredModel,
      promptText: original.promptText,
      styleSettings: original.styleSettings,
      tags: original.tags,
      thumbnail: original.thumbnail,
      useCount: 0,
    });
    return duplicate.save();
  }
}
