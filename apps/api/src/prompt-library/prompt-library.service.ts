import {
  type IPromptLibraryRepository,
  PROMPT_LIBRARY_REPOSITORY,
  type PromptLibraryItemEntity,
} from '@genfeedai/storage';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { CreatePromptLibraryItemDto } from './dto/create-prompt-library-item.dto';
import type { QueryPromptLibraryDto } from './dto/query-prompt-library.dto';

@Injectable()
export class PromptLibraryService {
  constructor(
    @Inject(PROMPT_LIBRARY_REPOSITORY)
    private readonly promptRepository: IPromptLibraryRepository
  ) {}

  async create(createDto: CreatePromptLibraryItemDto): Promise<PromptLibraryItemEntity> {
    return this.promptRepository.create({
      name: createDto.name,
      description: createDto.description,
      promptText: createDto.promptText,
      styleSettings: createDto.styleSettings ?? {},
      aspectRatio: createDto.aspectRatio,
      preferredModel: createDto.preferredModel,
      category: createDto.category,
      tags: createDto.tags ?? [],
      isFeatured: createDto.isFeatured,
      thumbnail: createDto.thumbnail,
    });
  }

  async findAll(query: QueryPromptLibraryDto): Promise<PromptLibraryItemEntity[]> {
    return this.promptRepository.findWithFilters({
      category: query.category,
      tag: query.tag,
      search: query.search,
      sortBy: query.sortBy ?? 'createdAt',
      sortOrder: query.sortOrder ?? 'desc',
      offset: query.offset ?? 0,
      limit: query.limit ?? 20,
    });
  }

  async findFeatured(limit = 10): Promise<PromptLibraryItemEntity[]> {
    return this.promptRepository.findFeatured(limit);
  }

  async findOne(id: string): Promise<PromptLibraryItemEntity> {
    const item = await this.promptRepository.findById(id);

    if (!item) {
      throw new NotFoundException(`Prompt library item with ID ${id} not found`);
    }

    return item;
  }

  async update(
    id: string,
    updateDto: Partial<CreatePromptLibraryItemDto>
  ): Promise<PromptLibraryItemEntity> {
    const item = await this.promptRepository.update(id, updateDto);

    if (!item) {
      throw new NotFoundException(`Prompt library item with ID ${id} not found`);
    }

    return item;
  }

  async remove(id: string): Promise<PromptLibraryItemEntity> {
    const item = await this.promptRepository.softDelete(id);

    if (!item) {
      throw new NotFoundException(`Prompt library item with ID ${id} not found`);
    }

    return item;
  }

  async incrementUseCount(id: string): Promise<PromptLibraryItemEntity> {
    const item = await this.promptRepository.incrementUseCount(id);

    if (!item) {
      throw new NotFoundException(`Prompt library item with ID ${id} not found`);
    }

    return item;
  }

  async duplicate(id: string): Promise<PromptLibraryItemEntity> {
    return this.promptRepository.duplicate(id);
  }
}
