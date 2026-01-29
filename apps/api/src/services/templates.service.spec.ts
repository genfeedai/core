import { NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';
import { TemplateCategory } from '@genfeedai/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Template } from '@/schemas/template.schema';
import { TemplatesService } from '@/services/templates.service';
import {
  createConstructableMockModel,
  createMockTemplate,
  createObjectId,
} from '@/test/mocks/mongoose.mock';

describe('TemplatesService', () => {
  let service: TemplatesService;
  let mockTemplate: ReturnType<typeof createMockTemplate>;

  const createMockTemplateModel = () => {
    mockTemplate = createMockTemplate();
    return createConstructableMockModel(
      {
        find: vi.fn().mockReturnValue({
          sort: vi.fn().mockReturnThis(),
          exec: vi.fn().mockResolvedValue([mockTemplate]),
        }),
        findOne: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue(mockTemplate),
        }),
        findOneAndUpdate: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue(mockTemplate),
        }),
        create: vi.fn().mockResolvedValue(mockTemplate),
        updateOne: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
        }),
      },
      () => ({
        ...mockTemplate,
        save: vi.fn().mockResolvedValue(mockTemplate),
      })
    );
  };

  beforeEach(async () => {
    const mockModel = createMockTemplateModel();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplatesService,
        {
          provide: getModelToken(Template.name),
          useValue: mockModel,
        },
      ],
    }).compile();

    service = module.get<TemplatesService>(TemplatesService);
  });

  describe('create', () => {
    it('should create a new template', async () => {
      const dto = {
        name: 'Test Template',
        description: 'A test template',
        category: TemplateCategory.IMAGE,
        nodes: [],
        edges: [],
      };

      const result = await service.create(dto);

      expect(result).toBeDefined();
      expect(result.name).toBe(mockTemplate.name);
    });

    it('should create template with default values', async () => {
      const dto = { name: 'Minimal Template', category: TemplateCategory.IMAGE };

      const result = await service.create(dto);

      expect(result).toBeDefined();
    });
  });

  describe('findAll', () => {
    it('should return all non-deleted templates', async () => {
      const result = await service.findAll({});

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockTemplate);
    });

    it('should filter by category', async () => {
      const result = await service.findAll({ category: TemplateCategory.IMAGE });

      expect(result).toHaveLength(1);
    });

    it('should ignore "all" category filter', async () => {
      const result = await service.findAll({ category: 'all' });

      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should return a template by id', async () => {
      const id = createObjectId().toString();

      const result = await service.findOne(id);

      expect(result).toEqual(mockTemplate);
    });

    it('should throw NotFoundException when template not found', async () => {
      const mockModel = createMockTemplateModel();
      mockModel.findOne = vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          TemplatesService,
          {
            provide: getModelToken(Template.name),
            useValue: mockModel,
          },
        ],
      }).compile();

      const serviceWithNullFind = module.get<TemplatesService>(TemplatesService);
      const id = createObjectId().toString();

      await expect(serviceWithNullFind.findOne(id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a template', async () => {
      const id = createObjectId().toString();
      const dto = { name: 'Updated Name' };

      const result = await service.update(id, dto);

      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when updating non-existent template', async () => {
      const mockModel = createMockTemplateModel();
      mockModel.findOneAndUpdate = vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          TemplatesService,
          {
            provide: getModelToken(Template.name),
            useValue: mockModel,
          },
        ],
      }).compile();

      const serviceWithNullUpdate = module.get<TemplatesService>(TemplatesService);
      const id = createObjectId().toString();

      await expect(serviceWithNullUpdate.update(id, { name: 'New' })).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('remove', () => {
    it('should soft delete a template', async () => {
      const id = createObjectId().toString();

      const result = await service.remove(id);

      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when removing non-existent template', async () => {
      const mockModel = createMockTemplateModel();
      mockModel.findOneAndUpdate = vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          TemplatesService,
          {
            provide: getModelToken(Template.name),
            useValue: mockModel,
          },
        ],
      }).compile();

      const serviceWithNullRemove = module.get<TemplatesService>(TemplatesService);
      const id = createObjectId().toString();

      await expect(serviceWithNullRemove.remove(id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('seedSystemTemplates', () => {
    it('should seed system templates', async () => {
      await expect(service.seedSystemTemplates()).resolves.not.toThrow();
    });
  });

  describe('onModuleInit', () => {
    it('should call seedSystemTemplates on module init', async () => {
      const seedSpy = vi.spyOn(service, 'seedSystemTemplates').mockResolvedValue();

      await service.onModuleInit();

      expect(seedSpy).toHaveBeenCalled();
    });
  });
});
