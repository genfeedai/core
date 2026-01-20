import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PromptLibraryController } from '@/controllers/prompt-library.controller';
import type { QueryPromptLibraryDto } from '@/dto/query-prompt-library.dto';
import type { PromptLibraryService } from '@/services/prompt-library.service';

describe('PromptLibraryController', () => {
  let controller: PromptLibraryController;

  const mockPromptItem = {
    id: 'prompt-1',
    name: 'Test Prompt',
    promptText: 'Generate a beautiful image',
    category: 'landscape',
    tags: ['nature'],
    useCount: 5,
  };

  const mockService = {
    create: vi.fn().mockResolvedValue(mockPromptItem),
    findAll: vi.fn().mockResolvedValue([mockPromptItem]),
    findFeatured: vi.fn().mockResolvedValue([mockPromptItem]),
    findOne: vi.fn().mockResolvedValue(mockPromptItem),
    update: vi.fn().mockResolvedValue(mockPromptItem),
    remove: vi.fn().mockResolvedValue(mockPromptItem),
    incrementUseCount: vi.fn().mockResolvedValue({ ...mockPromptItem, useCount: 6 }),
    duplicate: vi
      .fn()
      .mockResolvedValue({ ...mockPromptItem, id: 'prompt-2', name: 'Test Prompt (Copy)' }),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Instantiate controller directly with mocks (bypassing NestJS DI due to type-only imports)
    controller = new PromptLibraryController(mockService as unknown as PromptLibraryService);
  });

  describe('create', () => {
    it('should create a new prompt library item', async () => {
      const createDto = {
        name: 'Test Prompt',
        promptText: 'Generate a beautiful image',
      };

      const result = await controller.create(createDto);

      expect(result).toEqual(mockPromptItem);
      expect(mockService.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('findAll', () => {
    it('should return all prompt items', async () => {
      const query = {};

      const result = await controller.findAll(query);

      expect(result).toEqual([mockPromptItem]);
      expect(mockService.findAll).toHaveBeenCalledWith(query);
    });

    it('should pass query parameters to service', async () => {
      const query: QueryPromptLibraryDto = { search: 'sunset' };

      await controller.findAll(query);

      expect(mockService.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('findFeatured', () => {
    it('should return featured items with default limit', async () => {
      const result = await controller.findFeatured();

      expect(result).toEqual([mockPromptItem]);
      expect(mockService.findFeatured).toHaveBeenCalledWith(undefined);
    });

    it('should pass limit to service', async () => {
      await controller.findFeatured(5);

      expect(mockService.findFeatured).toHaveBeenCalledWith(5);
    });
  });

  describe('findOne', () => {
    it('should return a single prompt item', async () => {
      const result = await controller.findOne('prompt-1');

      expect(result).toEqual(mockPromptItem);
      expect(mockService.findOne).toHaveBeenCalledWith('prompt-1');
    });
  });

  describe('update', () => {
    it('should update a prompt item', async () => {
      const updateDto = { name: 'Updated Prompt' };

      const result = await controller.update('prompt-1', updateDto);

      expect(result).toEqual(mockPromptItem);
      expect(mockService.update).toHaveBeenCalledWith('prompt-1', updateDto);
    });
  });

  describe('remove', () => {
    it('should remove a prompt item', async () => {
      const result = await controller.remove('prompt-1');

      expect(result).toEqual(mockPromptItem);
      expect(mockService.remove).toHaveBeenCalledWith('prompt-1');
    });
  });

  describe('use', () => {
    it('should increment use count', async () => {
      const result = await controller.use('prompt-1');

      expect(result.useCount).toBe(6);
      expect(mockService.incrementUseCount).toHaveBeenCalledWith('prompt-1');
    });
  });

  describe('duplicate', () => {
    it('should duplicate a prompt item', async () => {
      const result = await controller.duplicate('prompt-1');

      expect(result.id).toBe('prompt-2');
      expect(result.name).toBe('Test Prompt (Copy)');
      expect(mockService.duplicate).toHaveBeenCalledWith('prompt-1');
    });
  });
});
