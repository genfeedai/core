import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import type {
  CreateTemplateData,
  TemplateEntity,
  UpdateTemplateData,
} from '../../entities/template.entity';
import type { FindOptions } from '../../interfaces/base-repository.interface';
import type { ITemplateRepository } from '../../interfaces/template.repository';

interface SqliteTemplateRow {
  id: string;
  name: string;
  description: string;
  category: string;
  nodes: string;
  edges: string;
  thumbnail: string | null;
  is_system: number;
  is_deleted: number;
  created_at: string;
  updated_at: string;
}

export class TemplateSqliteRepository implements ITemplateRepository {
  constructor(private db: Database.Database) {}

  async create(data: CreateTemplateData): Promise<TemplateEntity> {
    const id = randomUUID();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO templates (id, name, description, category, nodes, edges, thumbnail, is_system, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.name,
      data.description ?? '',
      data.category ?? 'custom',
      JSON.stringify(data.nodes ?? []),
      JSON.stringify(data.edges ?? []),
      data.thumbnail ?? null,
      data.isSystem ? 1 : 0,
      now,
      now
    );

    const result = await this.findById(id);
    if (!result) throw new Error('Failed to create template');
    return result;
  }

  async findById(id: string): Promise<TemplateEntity | null> {
    const stmt = this.db.prepare(`
      SELECT * FROM templates WHERE id = ? AND is_deleted = 0
    `);

    const row = stmt.get(id) as SqliteTemplateRow | undefined;
    return row ? this.mapRowToEntity(row) : null;
  }

  async findOne(options: FindOptions<TemplateEntity>): Promise<TemplateEntity | null> {
    const { whereClause, params } = this.buildWhereClause(options);

    const stmt = this.db.prepare(`
      SELECT * FROM templates WHERE is_deleted = 0 ${whereClause} LIMIT 1
    `);

    const row = stmt.get(...params) as SqliteTemplateRow | undefined;
    return row ? this.mapRowToEntity(row) : null;
  }

  async findAll(options?: FindOptions<TemplateEntity>): Promise<TemplateEntity[]> {
    const { whereClause, params, orderBy, limitOffset } = this.buildQueryClauses(options);

    const stmt = this.db.prepare(`
      SELECT * FROM templates
      WHERE is_deleted = 0 ${whereClause}
      ${orderBy}
      ${limitOffset}
    `);

    const rows = stmt.all(...params) as SqliteTemplateRow[];
    return rows.map((row) => this.mapRowToEntity(row));
  }

  async findByCategory(
    category: string,
    options?: FindOptions<TemplateEntity>
  ): Promise<TemplateEntity[]> {
    const { orderBy, limitOffset } = this.buildQueryClauses(options);

    const stmt = this.db.prepare(`
      SELECT * FROM templates
      WHERE category = ? AND is_deleted = 0
      ${orderBy}
      ${limitOffset}
    `);

    const rows = stmt.all(category) as SqliteTemplateRow[];
    return rows.map((row) => this.mapRowToEntity(row));
  }

  async findSystemTemplates(): Promise<TemplateEntity[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM templates WHERE is_system = 1 AND is_deleted = 0
      ORDER BY name ASC
    `);

    const rows = stmt.all() as SqliteTemplateRow[];
    return rows.map((row) => this.mapRowToEntity(row));
  }

  async upsertSystemTemplate(template: CreateTemplateData): Promise<TemplateEntity> {
    const existing = await this.findOne({
      where: { name: template.name, isSystem: true } as Partial<TemplateEntity>,
    });

    if (existing) {
      const updated = await this.update(existing.id, template);
      if (!updated) throw new Error('Failed to update system template');
      return updated;
    }

    return this.create({ ...template, isSystem: true });
  }

  async update(id: string, data: UpdateTemplateData): Promise<TemplateEntity | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const updates: string[] = ['updated_at = ?'];
    const params: unknown[] = [new Date().toISOString()];

    if (data.name !== undefined) {
      updates.push('name = ?');
      params.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      params.push(data.description);
    }
    if (data.category !== undefined) {
      updates.push('category = ?');
      params.push(data.category);
    }
    if (data.nodes !== undefined) {
      updates.push('nodes = ?');
      params.push(JSON.stringify(data.nodes));
    }
    if (data.edges !== undefined) {
      updates.push('edges = ?');
      params.push(JSON.stringify(data.edges));
    }
    if (data.thumbnail !== undefined) {
      updates.push('thumbnail = ?');
      params.push(data.thumbnail);
    }
    if (data.isSystem !== undefined) {
      updates.push('is_system = ?');
      params.push(data.isSystem ? 1 : 0);
    }

    params.push(id);

    const stmt = this.db.prepare(`
      UPDATE templates SET ${updates.join(', ')} WHERE id = ? AND is_deleted = 0
    `);

    stmt.run(...params);
    return this.findById(id);
  }

  async softDelete(id: string): Promise<TemplateEntity | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const stmt = this.db.prepare(`
      UPDATE templates SET is_deleted = 1, updated_at = ? WHERE id = ?
    `);

    stmt.run(new Date().toISOString(), id);
    return existing;
  }

  async hardDelete(id: string): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM templates WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  async count(options?: FindOptions<TemplateEntity>): Promise<number> {
    const { whereClause, params } = this.buildWhereClause(options);

    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM templates WHERE is_deleted = 0 ${whereClause}
    `);

    const result = stmt.get(...params) as { count: number };
    return result.count;
  }

  private mapRowToEntity(row: SqliteTemplateRow): TemplateEntity {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category,
      nodes: JSON.parse(row.nodes),
      edges: JSON.parse(row.edges),
      thumbnail: row.thumbnail ?? undefined,
      isSystem: Boolean(row.is_system),
      isDeleted: Boolean(row.is_deleted),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private buildWhereClause(options?: FindOptions<TemplateEntity>): {
    whereClause: string;
    params: unknown[];
  } {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (options?.where) {
      for (const [key, value] of Object.entries(options.where)) {
        const dbColumn = this.toSnakeCase(key);
        conditions.push(`AND ${dbColumn} = ?`);
        params.push(typeof value === 'boolean' ? (value ? 1 : 0) : value);
      }
    }

    return { whereClause: conditions.join(' '), params };
  }

  private buildQueryClauses(options?: FindOptions<TemplateEntity>): {
    whereClause: string;
    params: unknown[];
    orderBy: string;
    limitOffset: string;
  } {
    const { whereClause, params } = this.buildWhereClause(options);

    let orderBy = 'ORDER BY updated_at DESC';
    if (options?.sortBy) {
      const direction = options.sortOrder === 'asc' ? 'ASC' : 'DESC';
      orderBy = `ORDER BY ${this.toSnakeCase(options.sortBy)} ${direction}`;
    }

    let limitOffset = '';
    if (options?.limit) {
      limitOffset = `LIMIT ${options.limit}`;
      if (options.offset) {
        limitOffset += ` OFFSET ${options.offset}`;
      }
    }

    return { whereClause, params, orderBy, limitOffset };
  }

  private toSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }
}
