import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import type {
  CreatePromptData,
  PromptLibraryItemEntity,
  UpdatePromptData,
} from '../../entities/prompt-library.entity';
import type { FindOptions } from '../../interfaces/base-repository.interface';
import type {
  IPromptLibraryRepository,
  PromptQueryOptions,
} from '../../interfaces/prompt-library.repository';

interface SqlitePromptRow {
  id: string;
  name: string;
  description: string;
  prompt_text: string;
  style_settings: string;
  aspect_ratio: string;
  preferred_model: string | null;
  category: string;
  tags: string;
  use_count: number;
  is_featured: number;
  thumbnail: string | null;
  is_deleted: number;
  created_at: string;
  updated_at: string;
}

export class PromptLibrarySqliteRepository implements IPromptLibraryRepository {
  constructor(private db: Database.Database) {}

  async create(data: CreatePromptData): Promise<PromptLibraryItemEntity> {
    const id = randomUUID();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO prompt_library (id, name, description, prompt_text, style_settings, aspect_ratio, preferred_model, category, tags, is_featured, thumbnail, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.name,
      data.description ?? '',
      data.promptText,
      JSON.stringify(data.styleSettings ?? {}),
      data.aspectRatio ?? '1:1',
      data.preferredModel ?? null,
      data.category ?? 'general',
      JSON.stringify(data.tags ?? []),
      data.isFeatured ? 1 : 0,
      data.thumbnail ?? null,
      now,
      now
    );

    const result = await this.findById(id);
    if (!result) throw new Error('Failed to create prompt');
    return result;
  }

  async findById(id: string): Promise<PromptLibraryItemEntity | null> {
    const stmt = this.db.prepare(`
      SELECT * FROM prompt_library WHERE id = ? AND is_deleted = 0
    `);

    const row = stmt.get(id) as SqlitePromptRow | undefined;
    return row ? this.mapRowToEntity(row) : null;
  }

  async findOne(
    options: FindOptions<PromptLibraryItemEntity>
  ): Promise<PromptLibraryItemEntity | null> {
    const { whereClause, params } = this.buildWhereClause(options);

    const stmt = this.db.prepare(`
      SELECT * FROM prompt_library WHERE is_deleted = 0 ${whereClause} LIMIT 1
    `);

    const row = stmt.get(...params) as SqlitePromptRow | undefined;
    return row ? this.mapRowToEntity(row) : null;
  }

  async findAll(
    options?: FindOptions<PromptLibraryItemEntity>
  ): Promise<PromptLibraryItemEntity[]> {
    const { whereClause, params, orderBy, limitOffset } = this.buildQueryClauses(options);

    const stmt = this.db.prepare(`
      SELECT * FROM prompt_library
      WHERE is_deleted = 0 ${whereClause}
      ${orderBy}
      ${limitOffset}
    `);

    const rows = stmt.all(...params) as SqlitePromptRow[];
    return rows.map((row) => this.mapRowToEntity(row));
  }

  async findWithFilters(options: PromptQueryOptions): Promise<PromptLibraryItemEntity[]> {
    const conditions: string[] = ['is_deleted = 0'];
    const params: unknown[] = [];

    if (options.category) {
      conditions.push('category = ?');
      params.push(options.category);
    }

    if (options.search) {
      conditions.push('(name LIKE ? OR description LIKE ? OR prompt_text LIKE ?)');
      const searchPattern = `%${options.search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    if (options.tag) {
      conditions.push('tags LIKE ?');
      params.push(`%"${options.tag}"%`);
    }

    let orderBy = 'ORDER BY updated_at DESC';
    if (options.sortBy) {
      const direction = options.sortOrder === 'asc' ? 'ASC' : 'DESC';
      orderBy = `ORDER BY ${this.toSnakeCase(options.sortBy)} ${direction}`;
    }

    let limitOffset = '';
    if (options.limit) {
      limitOffset = `LIMIT ${options.limit}`;
      if (options.offset) {
        limitOffset += ` OFFSET ${options.offset}`;
      }
    }

    const stmt = this.db.prepare(`
      SELECT * FROM prompt_library
      WHERE ${conditions.join(' AND ')}
      ${orderBy}
      ${limitOffset}
    `);

    const rows = stmt.all(...params) as SqlitePromptRow[];
    return rows.map((row) => this.mapRowToEntity(row));
  }

  async findFeatured(limit = 10): Promise<PromptLibraryItemEntity[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM prompt_library
      WHERE is_featured = 1 AND is_deleted = 0
      ORDER BY use_count DESC
      LIMIT ?
    `);

    const rows = stmt.all(limit) as SqlitePromptRow[];
    return rows.map((row) => this.mapRowToEntity(row));
  }

  async incrementUseCount(id: string): Promise<PromptLibraryItemEntity | null> {
    const stmt = this.db.prepare(`
      UPDATE prompt_library
      SET use_count = use_count + 1, updated_at = ?
      WHERE id = ? AND is_deleted = 0
    `);

    stmt.run(new Date().toISOString(), id);
    return this.findById(id);
  }

  async duplicate(id: string): Promise<PromptLibraryItemEntity> {
    const original = await this.findById(id);
    if (!original) {
      throw new Error(`Prompt with ID ${id} not found`);
    }

    return this.create({
      name: `${original.name} (Copy)`,
      description: original.description,
      promptText: original.promptText,
      styleSettings: original.styleSettings,
      aspectRatio: original.aspectRatio,
      preferredModel: original.preferredModel,
      category: original.category,
      tags: original.tags,
      isFeatured: false,
      thumbnail: original.thumbnail,
    });
  }

  async update(id: string, data: UpdatePromptData): Promise<PromptLibraryItemEntity | null> {
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
    if (data.promptText !== undefined) {
      updates.push('prompt_text = ?');
      params.push(data.promptText);
    }
    if (data.styleSettings !== undefined) {
      updates.push('style_settings = ?');
      params.push(JSON.stringify(data.styleSettings));
    }
    if (data.aspectRatio !== undefined) {
      updates.push('aspect_ratio = ?');
      params.push(data.aspectRatio);
    }
    if (data.preferredModel !== undefined) {
      updates.push('preferred_model = ?');
      params.push(data.preferredModel);
    }
    if (data.category !== undefined) {
      updates.push('category = ?');
      params.push(data.category);
    }
    if (data.tags !== undefined) {
      updates.push('tags = ?');
      params.push(JSON.stringify(data.tags));
    }
    if (data.isFeatured !== undefined) {
      updates.push('is_featured = ?');
      params.push(data.isFeatured ? 1 : 0);
    }
    if (data.thumbnail !== undefined) {
      updates.push('thumbnail = ?');
      params.push(data.thumbnail);
    }

    params.push(id);

    const stmt = this.db.prepare(`
      UPDATE prompt_library SET ${updates.join(', ')} WHERE id = ? AND is_deleted = 0
    `);

    stmt.run(...params);
    return this.findById(id);
  }

  async softDelete(id: string): Promise<PromptLibraryItemEntity | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const stmt = this.db.prepare(`
      UPDATE prompt_library SET is_deleted = 1, updated_at = ? WHERE id = ?
    `);

    stmt.run(new Date().toISOString(), id);
    return existing;
  }

  async hardDelete(id: string): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM prompt_library WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  async count(options?: FindOptions<PromptLibraryItemEntity>): Promise<number> {
    const { whereClause, params } = this.buildWhereClause(options);

    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM prompt_library WHERE is_deleted = 0 ${whereClause}
    `);

    const result = stmt.get(...params) as { count: number };
    return result.count;
  }

  private mapRowToEntity(row: SqlitePromptRow): PromptLibraryItemEntity {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      promptText: row.prompt_text,
      styleSettings: JSON.parse(row.style_settings),
      aspectRatio: row.aspect_ratio,
      preferredModel: row.preferred_model ?? undefined,
      category: row.category,
      tags: JSON.parse(row.tags),
      useCount: row.use_count,
      isFeatured: Boolean(row.is_featured),
      thumbnail: row.thumbnail ?? undefined,
      isDeleted: Boolean(row.is_deleted),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private buildWhereClause(options?: FindOptions<PromptLibraryItemEntity>): {
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

  private buildQueryClauses(options?: FindOptions<PromptLibraryItemEntity>): {
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
