import {
  type IPromptLibraryRepository,
  PROMPT_LIBRARY_REPOSITORY,
  type PromptLibraryItemEntity,
} from '@genfeedai/storage';
import { NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PromptLibraryService } from './prompt-library.service';
import { PromptCategory } from './schemas/prompt-library-item.schema';

describe('PromptLibraryService', () => {
  let service: PromptLibraryService;
  let mockRepository: IPromptLibraryRepository;

  const mockPromptItem: PromptLibraryItemEntity = {
    id: 'prompt-1',
    name: 'Test Prompt',
    description: 'A test prompt',
    promptText: 'Generate a beautiful sunset over mountains',
    styleSettings: { style: 'photorealistic' },
    aspectRatio: '16:9',
    preferredModel: 'nano-banana-pro',
    category: 'landscape',
    tags: ['nature', 'sunset'],
    isFeatured: true,
    thumbnail: 'https://example.com/thumb.jpg',
    useCount: 10,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockRepository = {
      create: vi.fn().mockResolvedValue(mockPromptItem),
      findById: vi.fn().mockResolvedValue(mockPromptItem),
      findOne: vi.fn().mockResolvedValue(mockPromptItem),
      findAll: vi.fn().mockResolvedValue([mockPromptItem]),
      findWithFilters: vi.fn().mockResolvedValue([mockPromptItem]),
      findFeatured: vi.fn().mockResolvedValue([mockPromptItem]),
      update: vi.fn().mockResolvedValue(mockPromptItem),
      softDelete: vi.fn().mockResolvedValue(mockPromptItem),
      hardDelete: vi.fn().mockResolvedValue(true),
      incrementUseCount: vi.fn().mockResolvedValue({ ...mockPromptItem, useCount: 11 }),
      duplicate: vi
        .fn()
        .mockResolvedValue({ ...mockPromptItem, id: 'prompt-2', name: 'Test Prompt (Copy)' }),
      count: vi.fn().mockResolvedValue(1),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromptLibraryService,
        { provide: PROMPT_LIBRARY_REPOSITORY, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<PromptLibraryService>(PromptLibraryService);
  });

  describe('create', () => {
    it('should create a new prompt library item', async () => {
      const createDto = {
        name: 'Test Prompt',
        description: 'A test prompt',
        promptText: 'Generate a beautiful sunset over mountains',
        aspectRatio: '16:9' as const,
        preferredModel: 'nano-banana-pro' as const,
        category: PromptCategory.LANDSCAPE,
        tags: ['nature', 'sunset'],
        isFeatured: true,
        thumbnail: 'https://example.com/thumb.jpg',
      };

      const result = await service.create(createDto);

      expect(result).toEqual(mockPromptItem);
      expect(mockRepository.create).toHaveBeenCalledWith({
        name: createDto.name,
        description: createDto.description,
        promptText: createDto.promptText,
        styleSettings: {},
        aspectRatio: createDto.aspectRatio,
        preferredModel: createDto.preferredModel,
        category: createDto.category,
        tags: createDto.tags,
        isFeatured: createDto.isFeatured,
        thumbnail: createDto.thumbnail,
      });
    });

    it('should use default values for optional fields', async () => {
      const createDto = {
        name: 'Minimal Prompt',
        promptText: 'Generate something',
      };

      await service.create(createDto);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          styleSettings: {},
          tags: [],
        })
      );
    });

    it('should create prompt with style settings', async () => {
      const createDto = {
        name: 'Styled Prompt',
        promptText: 'Generate art',
        styleSettings: { mood: 'vibrant', style: 'abstract' },
      };

      await service.create(createDto);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          styleSettings: { mood: 'vibrant', style: 'abstract' },
        })
      );
    });
  });

  describe('findAll', () => {
    it('should return all prompts with default pagination', async () => {
      const query = {};

      const result = await service.findAll(query);

      expect(result).toEqual([mockPromptItem]);
      expect(mockRepository.findWithFilters).toHaveBeenCalledWith({
        category: undefined,
        tag: undefined,
        search: undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        offset: 0,
        limit: 20,
      });
    });

    it('should pass filter parameters to repository', async () => {
      const query = {
        category: PromptCategory.LANDSCAPE,
        tag: 'nature',
        search: 'sunset',
        sortBy: 'name' as const,
        sortOrder: 'asc' as const,
        offset: 10,
        limit: 50,
      };

      await service.findAll(query);

      expect(mockRepository.findWithFilters).toHaveBeenCalledWith({
        category: 'landscape',
        tag: 'nature',
        search: 'sunset',
        sortBy: 'name',
        sortOrder: 'asc',
        offset: 10,
        limit: 50,
      });
    });

    it('should return empty array when no prompts exist', async () => {
      vi.mocked(mockRepository.findWithFilters).mockResolvedValue([]);

      const result = await service.findAll({});

      expect(result).toEqual([]);
    });
  });

  describe('findFeatured', () => {
    it('should return featured prompts with default limit', async () => {
      const result = await service.findFeatured();

      expect(result).toEqual([mockPromptItem]);
      expect(mockRepository.findFeatured).toHaveBeenCalledWith(10);
    });

    it('should pass custom limit to repository', async () => {
      await service.findFeatured(5);

      expect(mockRepository.findFeatured).toHaveBeenCalledWith(5);
    });

    it('should return empty array when no featured prompts exist', async () => {
      vi.mocked(mockRepository.findFeatured).mockResolvedValue([]);

      const result = await service.findFeatured();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a prompt by ID', async () => {
      const result = await service.findOne('prompt-1');

      expect(result).toEqual(mockPromptItem);
      expect(mockRepository.findById).toHaveBeenCalledWith('prompt-1');
    });

    it('should throw NotFoundException when prompt not found', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null);

      await expect(service.findOne('nonexistent-id')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('nonexistent-id')).rejects.toThrow(
        'Prompt library item with ID nonexistent-id not found'
      );
    });
  });

  describe('update', () => {
    it('should update a prompt', async () => {
      const updateDto = { name: 'Updated Prompt' };
      vi.mocked(mockRepository.update).mockResolvedValue({
        ...mockPromptItem,
        name: 'Updated Prompt',
      });

      const result = await service.update('prompt-1', updateDto);

      expect(result.name).toBe('Updated Prompt');
      expect(mockRepository.update).toHaveBeenCalledWith('prompt-1', updateDto);
    });

    it('should update prompt text', async () => {
      const updateDto = { promptText: 'New prompt text' };
      vi.mocked(mockRepository.update).mockResolvedValue({
        ...mockPromptItem,
        promptText: 'New prompt text',
      });

      const result = await service.update('prompt-1', updateDto);

      expect(result.promptText).toBe('New prompt text');
    });

    it('should throw NotFoundException when prompt not found', async () => {
      vi.mocked(mockRepository.update).mockResolvedValue(null);

      await expect(service.update('nonexistent-id', { name: 'New Name' })).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('remove', () => {
    it('should soft delete a prompt', async () => {
      vi.mocked(mockRepository.softDelete).mockResolvedValue({
        ...mockPromptItem,
        isDeleted: true,
      });

      const result = await service.remove('prompt-1');

      expect(result.isDeleted).toBe(true);
      expect(mockRepository.softDelete).toHaveBeenCalledWith('prompt-1');
    });

    it('should throw NotFoundException when prompt not found', async () => {
      vi.mocked(mockRepository.softDelete).mockResolvedValue(null);

      await expect(service.remove('nonexistent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('incrementUseCount', () => {
    it('should increment use count', async () => {
      const result = await service.incrementUseCount('prompt-1');

      expect(result.useCount).toBe(11);
      expect(mockRepository.incrementUseCount).toHaveBeenCalledWith('prompt-1');
    });

    it('should throw NotFoundException when prompt not found', async () => {
      vi.mocked(mockRepository.incrementUseCount).mockResolvedValue(null);

      await expect(service.incrementUseCount('nonexistent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('duplicate', () => {
    it('should duplicate a prompt', async () => {
      const result = await service.duplicate('prompt-1');

      expect(result.id).toBe('prompt-2');
      expect(result.name).toBe('Test Prompt (Copy)');
      expect(mockRepository.duplicate).toHaveBeenCalledWith('prompt-1');
    });

    it('should preserve prompt content in duplicated prompt', async () => {
      vi.mocked(mockRepository.duplicate).mockResolvedValue({
        ...mockPromptItem,
        id: 'prompt-2',
        name: 'Test Prompt (Copy)',
      });

      const result = await service.duplicate('prompt-1');

      expect(result.promptText).toBe(mockPromptItem.promptText);
      expect(result.styleSettings).toEqual(mockPromptItem.styleSettings);
    });
  });
});
