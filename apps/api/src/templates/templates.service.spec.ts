import {
  type ITemplateRepository,
  TEMPLATE_REPOSITORY,
  type TemplateEntity,
} from '@genfeedai/storage';
import { NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TemplatesService } from './templates.service';

// Mock the templates.seed module
vi.mock('./templates.seed', () => ({
  SYSTEM_TEMPLATES: [
    {
      name: 'System Template 1',
      description: 'A system template',
      category: 'images',
      nodes: [],
      edges: [],
    },
  ],
}));

describe('TemplatesService', () => {
  let service: TemplatesService;
  let mockRepository: ITemplateRepository;

  const mockTemplateId = 'template-123';

  const mockTemplate: TemplateEntity = {
    id: mockTemplateId,
    name: 'Test Template',
    description: 'A test template',
    category: 'images',
    nodes: [
      { id: 'node-1', type: 'promptNode', position: { x: 0, y: 0 }, data: {} },
      { id: 'node-2', type: 'imageGenNode', position: { x: 200, y: 0 }, data: {} },
    ],
    edges: [{ id: 'edge-1', source: 'node-1', target: 'node-2' }],
    thumbnail: 'https://example.com/thumb.png',
    isSystem: false,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSystemTemplate: TemplateEntity = {
    ...mockTemplate,
    id: 'system-template-1',
    name: 'System Template',
    isSystem: true,
  };

  beforeEach(async () => {
    mockRepository = {
      create: vi.fn().mockResolvedValue(mockTemplate),
      findById: vi.fn().mockResolvedValue(mockTemplate),
      findOne: vi.fn().mockResolvedValue(mockTemplate),
      findAll: vi.fn().mockResolvedValue([mockTemplate, mockSystemTemplate]),
      findByCategory: vi.fn().mockResolvedValue([mockTemplate]),
      findSystemTemplates: vi.fn().mockResolvedValue([mockSystemTemplate]),
      upsertSystemTemplate: vi.fn().mockResolvedValue(mockSystemTemplate),
      update: vi.fn().mockResolvedValue(mockTemplate),
      softDelete: vi.fn().mockResolvedValue({ ...mockTemplate, isDeleted: true }),
      hardDelete: vi.fn().mockResolvedValue(true),
      count: vi.fn().mockResolvedValue(2),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [TemplatesService, { provide: TEMPLATE_REPOSITORY, useValue: mockRepository }],
    }).compile();

    service = module.get<TemplatesService>(TemplatesService);
  });

  describe('onModuleInit', () => {
    it('should seed system templates on init', async () => {
      await service.onModuleInit();

      expect(mockRepository.upsertSystemTemplate).toHaveBeenCalled();
    });

    it('should call upsertSystemTemplate for each system template', async () => {
      await service.onModuleInit();

      expect(mockRepository.upsertSystemTemplate).toHaveBeenCalledTimes(1);
      expect(mockRepository.upsertSystemTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'System Template 1',
          isSystem: true,
        })
      );
    });
  });

  describe('seedSystemTemplates', () => {
    it('should upsert system templates', async () => {
      await service.seedSystemTemplates();

      expect(mockRepository.upsertSystemTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'System Template 1',
          isSystem: true,
        })
      );
    });
  });

  describe('create', () => {
    it('should create a new template', async () => {
      const createDto = {
        name: 'New Template',
        description: 'A new template',
        category: 'video',
      };

      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect(mockRepository.create).toHaveBeenCalledWith({
        name: 'New Template',
        description: 'A new template',
        category: 'video',
        nodes: [],
        edges: [],
        thumbnail: undefined,
      });
    });

    it('should create template with nodes and edges', async () => {
      const createDto = {
        name: 'Template with nodes',
        category: 'images',
        nodes: [{ id: 'n1', type: 'test', position: { x: 0, y: 0 } }],
        edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
      };

      await service.create(createDto);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          nodes: expect.any(Array),
          edges: expect.any(Array),
        })
      );
    });

    it('should create template with thumbnail', async () => {
      const createDto = {
        name: 'Template with thumbnail',
        category: 'images',
        thumbnail: 'https://example.com/thumbnail.png',
      };

      await service.create(createDto);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          thumbnail: 'https://example.com/thumbnail.png',
        })
      );
    });

    it('should create template with empty nodes when not provided', async () => {
      const createDto = {
        name: 'Empty Template',
        category: 'images',
      };

      await service.create(createDto);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          nodes: [],
          edges: [],
        })
      );
    });
  });

  describe('findAll', () => {
    it('should return all templates when no category specified', async () => {
      const result = await service.findAll();

      expect(result).toEqual([mockTemplate, mockSystemTemplate]);
      expect(mockRepository.findAll).toHaveBeenCalledWith({
        sortBy: 'name',
        sortOrder: 'asc',
      });
    });

    it('should return all templates when category is "all"', async () => {
      await service.findAll('all');

      expect(mockRepository.findAll).toHaveBeenCalled();
      expect(mockRepository.findByCategory).not.toHaveBeenCalled();
    });

    it('should filter by category when provided', async () => {
      const result = await service.findAll('images');

      expect(result).toEqual([mockTemplate]);
      expect(mockRepository.findByCategory).toHaveBeenCalledWith('images', {
        sortBy: 'name',
        sortOrder: 'asc',
      });
    });

    it('should filter by video category', async () => {
      vi.mocked(mockRepository.findByCategory).mockResolvedValue([]);

      const result = await service.findAll('video');

      expect(result).toEqual([]);
      expect(mockRepository.findByCategory).toHaveBeenCalledWith('video', {
        sortBy: 'name',
        sortOrder: 'asc',
      });
    });

    it('should return empty array when no templates exist', async () => {
      vi.mocked(mockRepository.findAll).mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a single template by ID', async () => {
      const result = await service.findOne(mockTemplateId);

      expect(result).toEqual(mockTemplate);
      expect(mockRepository.findById).toHaveBeenCalledWith(mockTemplateId);
    });

    it('should throw NotFoundException when template not found', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null);

      await expect(service.findOne('nonexistent-id')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('nonexistent-id')).rejects.toThrow(
        'Template with ID nonexistent-id not found'
      );
    });

    it('should return system template by ID', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(mockSystemTemplate);

      const result = await service.findOne('system-template-1');

      expect(result.isSystem).toBe(true);
    });
  });

  describe('update', () => {
    it('should update template name', async () => {
      const updatedTemplate = { ...mockTemplate, name: 'Updated Template' };
      vi.mocked(mockRepository.update).mockResolvedValue(updatedTemplate);

      const result = await service.update(mockTemplateId, { name: 'Updated Template' });

      expect(result.name).toBe('Updated Template');
    });

    it('should update template category', async () => {
      const updatedTemplate = { ...mockTemplate, category: 'video' };
      vi.mocked(mockRepository.update).mockResolvedValue(updatedTemplate);

      const result = await service.update(mockTemplateId, { category: 'video' });

      expect(result.category).toBe('video');
    });

    it('should update template description', async () => {
      const updatedTemplate = { ...mockTemplate, description: 'New description' };
      vi.mocked(mockRepository.update).mockResolvedValue(updatedTemplate);

      const result = await service.update(mockTemplateId, { description: 'New description' });

      expect(result.description).toBe('New description');
    });

    it('should update template nodes', async () => {
      const newNodes = [{ id: 'node-3', type: 'outputNode', position: { x: 400, y: 0 } }];
      const updatedTemplate = { ...mockTemplate, nodes: newNodes };
      vi.mocked(mockRepository.update).mockResolvedValue(updatedTemplate);

      const result = await service.update(mockTemplateId, { nodes: newNodes });

      expect(result.nodes).toEqual(newNodes);
    });

    it('should update template edges', async () => {
      const newEdges = [{ id: 'edge-2', source: 'node-1', target: 'node-3' }];
      const updatedTemplate = { ...mockTemplate, edges: newEdges };
      vi.mocked(mockRepository.update).mockResolvedValue(updatedTemplate);

      const result = await service.update(mockTemplateId, { edges: newEdges });

      expect(result.edges).toEqual(newEdges);
    });

    it('should throw NotFoundException when template not found', async () => {
      vi.mocked(mockRepository.update).mockResolvedValue(null);

      await expect(service.update('nonexistent-id', { name: 'Updated' })).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('remove', () => {
    it('should soft delete template', async () => {
      const deletedTemplate = { ...mockTemplate, isDeleted: true };
      vi.mocked(mockRepository.softDelete).mockResolvedValue(deletedTemplate);

      const result = await service.remove(mockTemplateId);

      expect(result.isDeleted).toBe(true);
      expect(mockRepository.softDelete).toHaveBeenCalledWith(mockTemplateId);
    });

    it('should throw NotFoundException when template not found', async () => {
      vi.mocked(mockRepository.softDelete).mockResolvedValue(null);

      await expect(service.remove('nonexistent-id')).rejects.toThrow(NotFoundException);
    });

    it('should not delete system templates', async () => {
      vi.mocked(mockRepository.softDelete).mockResolvedValue(null);

      await expect(service.remove('system-template-1')).rejects.toThrow(NotFoundException);
    });
  });
});
