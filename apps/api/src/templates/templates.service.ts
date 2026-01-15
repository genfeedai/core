import {
  type ITemplateRepository,
  TEMPLATE_REPOSITORY,
  type TemplateEntity,
  type WorkflowEdgeEntity,
  type WorkflowNodeEntity,
} from '@genfeedai/storage';
import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { throwIfNotFound } from '../common/utils';
import type { CreateTemplateDto } from './dto/create-template.dto';
import { SYSTEM_TEMPLATES } from './templates.seed';

@Injectable()
export class TemplatesService implements OnModuleInit {
  private readonly logger = new Logger(TemplatesService.name);

  constructor(
    @Inject(TEMPLATE_REPOSITORY)
    private readonly templateRepository: ITemplateRepository
  ) {}

  async onModuleInit() {
    await this.seedSystemTemplates();
  }

  async seedSystemTemplates(): Promise<void> {
    for (const template of SYSTEM_TEMPLATES) {
      await this.templateRepository.upsertSystemTemplate({
        ...template,
        isSystem: true,
      });
      this.logger.log(`Seeded template: ${template.name}`);
    }
  }

  async create(createTemplateDto: CreateTemplateDto): Promise<TemplateEntity> {
    return this.templateRepository.create({
      name: createTemplateDto.name,
      description: createTemplateDto.description,
      category: createTemplateDto.category,
      nodes: (createTemplateDto.nodes ?? []) as unknown as WorkflowNodeEntity[],
      edges: (createTemplateDto.edges ?? []) as unknown as WorkflowEdgeEntity[],
      thumbnail: createTemplateDto.thumbnail,
    });
  }

  async findAll(category?: string): Promise<TemplateEntity[]> {
    if (category && category !== 'all') {
      return this.templateRepository.findByCategory(category, {
        sortBy: 'name',
        sortOrder: 'asc',
      });
    }
    return this.templateRepository.findAll({
      sortBy: 'name',
      sortOrder: 'asc',
    });
  }

  async findOne(id: string): Promise<TemplateEntity> {
    const template = await this.templateRepository.findById(id);
    return throwIfNotFound(template, 'Template', id);
  }

  async update(id: string, updateTemplateDto: Partial<CreateTemplateDto>): Promise<TemplateEntity> {
    const updateData = {
      ...updateTemplateDto,
      nodes: updateTemplateDto.nodes
        ? (updateTemplateDto.nodes as unknown as WorkflowNodeEntity[])
        : undefined,
      edges: updateTemplateDto.edges
        ? (updateTemplateDto.edges as unknown as WorkflowEdgeEntity[])
        : undefined,
    };

    const template = await this.templateRepository.update(id, updateData);
    return throwIfNotFound(template, 'Template', id);
  }

  async remove(id: string): Promise<TemplateEntity> {
    const template = await this.templateRepository.softDelete(id);
    return throwIfNotFound(template, 'Template', id);
  }
}
