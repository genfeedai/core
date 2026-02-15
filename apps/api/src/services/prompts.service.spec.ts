import { NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prompt } from '@/schemas/prompt.schema';
import { PromptsService } from '@/services/prompts.service';
import { createConstructableMockModel, createObjectId } from '@/test/mocks/mongoose.mock';

function createMockPrompt(overrides = {}) {
  return {
    _id: createObjectId(),
    aspectRatio: '16:9',
    category: 'custom',
    createdAt: new Date(),
    description: 'A test prompt',
    isDeleted: false,
    isFeatured: false,
    name: 'Test Prompt',
    preferredModel: 'nano-banana',
    promptText: 'Generate something amazing',
    save: vi.fn().mockImplementation(function (this: unknown) {
      return Promise.resolve(this);
    }),
    styleSettings: {},
    tags: ['test', 'sample'],
    thumbnail: null,
    updatedAt: new Date(),
    useCount: 0,
    ...overrides,
  };
}

describe('PromptsService', () => {
  let service: PromptsService;
  let mockPrompt: ReturnType<typeof createMockPrompt>;

  const createMockPromptModel = () => {
    mockPrompt = createMockPrompt();
    return createConstructableMockModel(
      {
        find: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue([mockPrompt]),
          limit: vi.fn().mockReturnThis(),
          skip: vi.fn().mockReturnThis(),
          sort: vi.fn().mockReturnThis(),
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
        PromptsService,
        {
          provide: getModelToken(Prompt.name),
          useValue: mockModel,
        },
      ],
    }).compile();

    service = module.get<PromptsService>(PromptsService);
  });

  describe('create', () => {
    it('should create a new prompt library item', async () => {
      const dto = {
        category: 'custom' as const,
        name: 'Test Prompt',
        promptText: 'Generate something amazing',
      };

      const result = await service.create(dto);

      expect(result).toBeDefined();
      expect(result.name).toBe(mockPrompt.name);
    });

    it('should create prompt with all optional fields', async () => {
      const dto = {
        aspectRatio: '16:9',
        category: 'custom' as const,
        description: 'A complete prompt',
        isFeatured: true,
        name: 'Full Prompt',
        preferredModel: 'nano-banana',
        promptText: 'Generate something',
        styleSettings: { mood: 'cinematic' },
        tags: ['test'],
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
      const result = await service.findAll({ category: 'custom' });

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
      const result = await service.findAll({ limit: 10, offset: 0 });

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
          PromptsService,
          {
            provide: getModelToken(Prompt.name),
            useValue: mockModel,
          },
        ],
      }).compile();

      const serviceWithNullFind = module.get<PromptsService>(PromptsService);
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
          PromptsService,
          {
            provide: getModelToken(Prompt.name),
            useValue: mockModel,
          },
        ],
      }).compile();

      const serviceWithNullUpdate = module.get<PromptsService>(PromptsService);
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
          PromptsService,
          {
            provide: getModelToken(Prompt.name),
            useValue: mockModel,
          },
        ],
      }).compile();

      const serviceWithNullRemove = module.get<PromptsService>(PromptsService);
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
          PromptsService,
          {
            provide: getModelToken(Prompt.name),
            useValue: mockModel,
          },
        ],
      }).compile();

      const serviceWithNullUpdate = module.get<PromptsService>(PromptsService);
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
          PromptsService,
          {
            provide: getModelToken(Prompt.name),
            useValue: mockModel,
          },
        ],
      }).compile();

      const serviceWithNullFind = module.get<PromptsService>(PromptsService);
      const id = createObjectId().toString();

      await expect(serviceWithNullFind.duplicate(id)).rejects.toThrow(NotFoundException);
    });
  });
});
