import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import type {
  CreateWorkflowData,
  UpdateWorkflowData,
  WorkflowEntity,
} from '../../entities/workflow.entity';
import type { FindOptions } from '../../interfaces/base-repository.interface';
import type { IWorkflowRepository } from '../../interfaces/workflow.repository';

interface SqliteWorkflowRow {
  id: string;
  name: string;
  description: string;
  version: number;
  nodes: string;
  edges: string;
  edge_style: string;
  groups: string;
  is_deleted: number;
  created_at: string;
  updated_at: string;
}

export class WorkflowSqliteRepository implements IWorkflowRepository {
  constructor(private db: Database.Database) {}

  async create(data: CreateWorkflowData): Promise<WorkflowEntity> {
    const id = randomUUID();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO workflows (id, name, description, nodes, edges, edge_style, groups, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.name,
      data.description ?? '',
      JSON.stringify(data.nodes ?? []),
      JSON.stringify(data.edges ?? []),
      data.edgeStyle ?? 'smoothstep',
      JSON.stringify(data.groups ?? []),
      now,
      now
    );

    const result = await this.findById(id);
    if (!result) throw new Error('Failed to create workflow');
    return result;
  }

  async findById(id: string): Promise<WorkflowEntity | null> {
    const stmt = this.db.prepare(`
      SELECT * FROM workflows WHERE id = ? AND is_deleted = 0
    `);

    const row = stmt.get(id) as SqliteWorkflowRow | undefined;
    return row ? this.mapRowToEntity(row) : null;
  }

  async findOne(options: FindOptions<WorkflowEntity>): Promise<WorkflowEntity | null> {
    const { whereClause, params } = this.buildWhereClause(options);

    const stmt = this.db.prepare(`
      SELECT * FROM workflows WHERE is_deleted = 0 ${whereClause} LIMIT 1
    `);

    const row = stmt.get(...params) as SqliteWorkflowRow | undefined;
    return row ? this.mapRowToEntity(row) : null;
  }

  async findAll(options?: FindOptions<WorkflowEntity>): Promise<WorkflowEntity[]> {
    const { whereClause, params, orderBy, limitOffset } = this.buildQueryClauses(options);

    const stmt = this.db.prepare(`
      SELECT * FROM workflows
      WHERE is_deleted = 0 ${whereClause}
      ${orderBy}
      ${limitOffset}
    `);

    const rows = stmt.all(...params) as SqliteWorkflowRow[];
    return rows.map((row) => this.mapRowToEntity(row));
  }

  async findAllActive(options?: FindOptions<WorkflowEntity>): Promise<WorkflowEntity[]> {
    return this.findAll(options);
  }

  async findByName(name: string): Promise<WorkflowEntity | null> {
    return this.findOne({ where: { name } as Partial<WorkflowEntity> });
  }

  async update(id: string, data: UpdateWorkflowData): Promise<WorkflowEntity | null> {
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
    if (data.nodes !== undefined) {
      updates.push('nodes = ?');
      params.push(JSON.stringify(data.nodes));
    }
    if (data.edges !== undefined) {
      updates.push('edges = ?');
      params.push(JSON.stringify(data.edges));
    }
    if (data.edgeStyle !== undefined) {
      updates.push('edge_style = ?');
      params.push(data.edgeStyle);
    }
    if (data.groups !== undefined) {
      updates.push('groups = ?');
      params.push(JSON.stringify(data.groups));
    }

    params.push(id);

    const stmt = this.db.prepare(`
      UPDATE workflows SET ${updates.join(', ')} WHERE id = ? AND is_deleted = 0
    `);

    stmt.run(...params);
    return this.findById(id);
  }

  async softDelete(id: string): Promise<WorkflowEntity | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const stmt = this.db.prepare(`
      UPDATE workflows SET is_deleted = 1, updated_at = ? WHERE id = ?
    `);

    stmt.run(new Date().toISOString(), id);
    return existing;
  }

  async hardDelete(id: string): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM workflows WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  async count(options?: FindOptions<WorkflowEntity>): Promise<number> {
    const { whereClause, params } = this.buildWhereClause(options);

    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM workflows WHERE is_deleted = 0 ${whereClause}
    `);

    const result = stmt.get(...params) as { count: number };
    return result.count;
  }

  async duplicate(id: string): Promise<WorkflowEntity> {
    const original = await this.findById(id);
    if (!original) {
      throw new Error(`Workflow with ID ${id} not found`);
    }

    return this.create({
      name: `${original.name} (Copy)`,
      description: original.description,
      nodes: original.nodes,
      edges: original.edges,
      edgeStyle: original.edgeStyle,
      groups: original.groups,
    });
  }

  async search(query: string, options?: FindOptions<WorkflowEntity>): Promise<WorkflowEntity[]> {
    const { orderBy, limitOffset } = this.buildQueryClauses(options);

    const stmt = this.db.prepare(`
      SELECT * FROM workflows
      WHERE is_deleted = 0
        AND (name LIKE ? OR description LIKE ?)
      ${orderBy}
      ${limitOffset}
    `);

    const searchPattern = `%${query}%`;
    const rows = stmt.all(searchPattern, searchPattern) as SqliteWorkflowRow[];
    return rows.map((row) => this.mapRowToEntity(row));
  }

  private mapRowToEntity(row: SqliteWorkflowRow): WorkflowEntity {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      version: row.version,
      nodes: JSON.parse(row.nodes),
      edges: JSON.parse(row.edges),
      edgeStyle: row.edge_style,
      groups: JSON.parse(row.groups),
      isDeleted: Boolean(row.is_deleted),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private buildWhereClause(options?: FindOptions<WorkflowEntity>): {
    whereClause: string;
    params: unknown[];
  } {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (options?.where) {
      for (const [key, value] of Object.entries(options.where)) {
        const dbColumn = this.toSnakeCase(key);
        conditions.push(`AND ${dbColumn} = ?`);
        params.push(value);
      }
    }

    return { whereClause: conditions.join(' '), params };
  }

  private buildQueryClauses(options?: FindOptions<WorkflowEntity>): {
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
