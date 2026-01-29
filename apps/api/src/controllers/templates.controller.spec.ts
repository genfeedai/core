import { TemplateCategory } from '@genfeedai/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TemplatesController } from '@/controllers/templates.controller';
import type { TemplatesService } from '@/services/templates.service';

describe('TemplatesController', () => {
  let controller: TemplatesController;

  const mockTemplate = {
    id: 'template-1',
    name: 'Test Template',
    description: 'A test template',
    category: TemplateCategory.IMAGE,
    promptText: 'Generate a beautiful {{subject}}',
    variables: [{ name: 'subject', description: 'The subject to generate' }],
    isSystem: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockService = {
    create: vi.fn().mockResolvedValue(mockTemplate),
    findAll: vi.fn().mockResolvedValue([mockTemplate]),
    findOne: vi.fn().mockResolvedValue(mockTemplate),
    update: vi.fn().mockResolvedValue(mockTemplate),
    remove: vi.fn().mockResolvedValue(mockTemplate),
    seedSystemTemplates: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Instantiate controller directly with mocks (bypassing NestJS DI due to type-only imports)
    controller = new TemplatesController(mockService as unknown as TemplatesService);
  });

  describe('create', () => {
    it('should create a new template', async () => {
      const createDto = {
        name: 'Test Template',
        promptText: 'Generate a beautiful {{subject}}',
        category: TemplateCategory.IMAGE,
      };

      const result = await controller.create(createDto);

      expect(result).toEqual(mockTemplate);
      expect(mockService.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('findAll', () => {
    it('should return all templates', async () => {
      const result = await controller.findAll();

      expect(result).toEqual([mockTemplate]);
      expect(mockService.findAll).toHaveBeenCalledWith({ category: undefined, search: undefined });
    });

    it('should filter by category when provided', async () => {
      await controller.findAll(TemplateCategory.IMAGE);

      expect(mockService.findAll).toHaveBeenCalledWith({
        category: TemplateCategory.IMAGE,
        search: undefined,
      });
    });
  });

  describe('findOne', () => {
    it('should return a single template', async () => {
      const result = await controller.findOne('template-1');

      expect(result).toEqual(mockTemplate);
      expect(mockService.findOne).toHaveBeenCalledWith('template-1');
    });
  });

  describe('update', () => {
    it('should update a template', async () => {
      const updateDto = { name: 'Updated Template' };

      const result = await controller.update('template-1', updateDto);

      expect(result).toEqual(mockTemplate);
      expect(mockService.update).toHaveBeenCalledWith('template-1', updateDto);
    });
  });

  describe('remove', () => {
    it('should remove a template', async () => {
      const result = await controller.remove('template-1');

      expect(result).toEqual(mockTemplate);
      expect(mockService.remove).toHaveBeenCalledWith('template-1');
    });
  });

  describe('seed', () => {
    it('should seed system templates', async () => {
      const result = await controller.seed();

      expect(result).toEqual({ message: 'System templates seeded successfully' });
      expect(mockService.seedSystemTemplates).toHaveBeenCalled();
    });
  });
});
