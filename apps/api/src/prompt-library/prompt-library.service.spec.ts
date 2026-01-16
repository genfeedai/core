import { NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createConstructableMockModel, createObjectId } from '../test/mocks/mongoose.mock';
import { PromptLibraryService } from './prompt-library.service';
import { PromptLibraryItem } from './schemas/prompt-library-item.schema';

function createMockPromptLibraryItem(overrides = {}) {
  return {
    _id: createObjectId(),
    name: 'Test Prompt',
    description: 'A test prompt',
    promptText: 'Generate something amazing',
    styleSettings: {},
    aspectRatio: '16:9',
    preferredModel: 'nano-banana',
    category: 'creative',
    tags: ['test', 'sample'],
    isFeatured: false,
    useCount: 0,
    thumbnail: null,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    save: vi.fn().mockImplementation(function (this: unknown) {
      return Promise.resolve(this);
    }),
    ...overrides,
  };
}

describe('PromptLibraryService', () => {
  let service: PromptLibraryService;
  let mockPrompt: ReturnType<typeof createMockPromptLibraryItem>;

  const createMockPromptModel = () => {
    mockPrompt = createMockPromptLibraryItem();
    return createConstructableMockModel(
      {
        find: vi.fn().mockReturnValue({
          sort: vi.fn().mockReturnThis(),
          skip: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          exec: vi.fn().mockResolvedValue([mockPrompt]),
        }),
        findOne: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue(mockPrompt),
        }),
        findOneAndUpdate: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue(mockPrompt),
        }),
      },
      () => ({
        ...mockPrompt,
        save: vi.fn().mockResolvedValue(mockPrompt),
      })
    );
  };

  beforeEach(async () => {
    const mockModel = createMockPromptModel();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromptLibraryService,
        {
          provide: getModelToken(PromptLibraryItem.name),
          useValue: mockModel,
        },
      ],
    }).compile();

    service = module.get<PromptLibraryService>(PromptLibraryService);
  });

  describe('create', () => {
    it('should create a new prompt library item', async () => {
      const dto = {
        name: 'Test Prompt',
        promptText: 'Generate something amazing',
        category: 'creative',
      };

      const result = await service.create(dto);

      expect(result).toBeDefined();
      expect(result.name).toBe(mockPrompt.name);
    });

    it('should create prompt with all optional fields', async () => {
      const dto = {
        name: 'Full Prompt',
        description: 'A complete prompt',
        promptText: 'Generate something',
        styleSettings: { color: 'blue' },
        aspectRatio: '16:9',
        preferredModel: 'nano-banana',
        category: 'creative',
        tags: ['test'],
        isFeatured: true,
        thumbnail: 'https://example.com/thumb.jpg',
      };

      const result = await service.create(dto);

      expect(result).toBeDefined();
    });
  });

  describe('findAll', () => {
    it('should return all non-deleted prompts', async () => {
      const result = await service.findAll({});

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockPrompt);
    });

    it('should filter by category', async () => {
      const result = await service.findAll({ category: 'creative' });

      expect(result).toHaveLength(1);
    });

    it('should filter by tag', async () => {
      const result = await service.findAll({ tag: 'test' });

      expect(result).toHaveLength(1);
    });

    it('should support text search', async () => {
      const result = await service.findAll({ search: 'amazing' });

      expect(result).toHaveLength(1);
    });

    it('should support pagination', async () => {
      const result = await service.findAll({ offset: 0, limit: 10 });

      expect(result).toHaveLength(1);
    });

    it('should support sorting', async () => {
      const result = await service.findAll({ sortBy: 'name', sortOrder: 'asc' });

      expect(result).toHaveLength(1);
    });
  });

  describe('findFeatured', () => {
    it('should return featured prompts sorted by useCount', async () => {
      const result = await service.findFeatured();

      expect(result).toHaveLength(1);
    });

    it('should respect limit parameter', async () => {
      const result = await service.findFeatured(5);

      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should return a prompt by id', async () => {
      const id = createObjectId().toString();

      const result = await service.findOne(id);

      expect(result).toEqual(mockPrompt);
    });

    it('should throw NotFoundException when prompt not found', async () => {
      const mockModel = createMockPromptModel();
      mockModel.findOne = vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PromptLibraryService,
          {
            provide: getModelToken(PromptLibraryItem.name),
            useValue: mockModel,
          },
        ],
      }).compile();

      const serviceWithNullFind = module.get<PromptLibraryService>(PromptLibraryService);
      const id = createObjectId().toString();

      await expect(serviceWithNullFind.findOne(id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a prompt', async () => {
      const id = createObjectId().toString();
      const dto = { name: 'Updated Name' };

      const result = await service.update(id, dto);

      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when updating non-existent prompt', async () => {
      const mockModel = createMockPromptModel();
      mockModel.findOneAndUpdate = vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PromptLibraryService,
          {
            provide: getModelToken(PromptLibraryItem.name),
            useValue: mockModel,
          },
        ],
      }).compile();

      const serviceWithNullUpdate = module.get<PromptLibraryService>(PromptLibraryService);
      const id = createObjectId().toString();

      await expect(serviceWithNullUpdate.update(id, { name: 'New' })).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('remove', () => {
    it('should soft delete a prompt', async () => {
      const id = createObjectId().toString();

      const result = await service.remove(id);

      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when removing non-existent prompt', async () => {
      const mockModel = createMockPromptModel();
      mockModel.findOneAndUpdate = vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PromptLibraryService,
          {
            provide: getModelToken(PromptLibraryItem.name),
            useValue: mockModel,
          },
        ],
      }).compile();

      const serviceWithNullRemove = module.get<PromptLibraryService>(PromptLibraryService);
      const id = createObjectId().toString();

      await expect(serviceWithNullRemove.remove(id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('incrementUseCount', () => {
    it('should increment use count', async () => {
      const id = createObjectId().toString();

      const result = await service.incrementUseCount(id);

      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when incrementing non-existent prompt', async () => {
      const mockModel = createMockPromptModel();
      mockModel.findOneAndUpdate = vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PromptLibraryService,
          {
            provide: getModelToken(PromptLibraryItem.name),
            useValue: mockModel,
          },
        ],
      }).compile();

      const serviceWithNullUpdate = module.get<PromptLibraryService>(PromptLibraryService);
      const id = createObjectId().toString();

      await expect(serviceWithNullUpdate.incrementUseCount(id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('duplicate', () => {
    it('should duplicate a prompt with "(copy)" suffix', async () => {
      const id = createObjectId().toString();

      const result = await service.duplicate(id);

      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when duplicating non-existent prompt', async () => {
      const mockModel = createMockPromptModel();
      mockModel.findOne = vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PromptLibraryService,
          {
            provide: getModelToken(PromptLibraryItem.name),
            useValue: mockModel,
          },
        ],
      }).compile();

      const serviceWithNullFind = module.get<PromptLibraryService>(PromptLibraryService);
      const id = createObjectId().toString();

      await expect(serviceWithNullFind.duplicate(id)).rejects.toThrow(NotFoundException);
    });
  });
});
