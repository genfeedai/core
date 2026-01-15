import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import type {
  CostSummaryData,
  CreateExecutionData,
  ExecutionEntity,
  NodeResultData,
  UpdateExecutionData,
} from '../../entities/execution.entity';
import type { FindOptions } from '../../interfaces/base-repository.interface';
import type { IExecutionRepository } from '../../interfaces/execution.repository';

interface SqliteExecutionRow {
  id: string;
  workflow_id: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  total_cost: number;
  cost_summary: string;
  node_results: string;
  error: string | null;
  is_deleted: number;
  execution_mode: string;
  queue_job_ids: string;
  resumed_from: string | null;
  created_at: string;
  updated_at: string;
}

export class ExecutionSqliteRepository implements IExecutionRepository {
  constructor(private db: Database.Database) {}

  async create(data: CreateExecutionData): Promise<ExecutionEntity> {
    const id = randomUUID();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO executions (id, workflow_id, execution_mode, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(id, data.workflowId, data.executionMode ?? 'sync', now, now);

    const result = await this.findById(id);
    if (!result) throw new Error('Failed to create execution');
    return result;
  }

  async findById(id: string): Promise<ExecutionEntity | null> {
    const stmt = this.db.prepare(`
      SELECT * FROM executions WHERE id = ? AND is_deleted = 0
    `);

    const row = stmt.get(id) as SqliteExecutionRow | undefined;
    return row ? this.mapRowToEntity(row) : null;
  }

  async findOne(options: FindOptions<ExecutionEntity>): Promise<ExecutionEntity | null> {
    const { whereClause, params } = this.buildWhereClause(options);

    const stmt = this.db.prepare(`
      SELECT * FROM executions WHERE is_deleted = 0 ${whereClause} LIMIT 1
    `);

    const row = stmt.get(...params) as SqliteExecutionRow | undefined;
    return row ? this.mapRowToEntity(row) : null;
  }

  async findAll(options?: FindOptions<ExecutionEntity>): Promise<ExecutionEntity[]> {
    const { whereClause, params, orderBy, limitOffset } = this.buildQueryClauses(options);

    const stmt = this.db.prepare(`
      SELECT * FROM executions
      WHERE is_deleted = 0 ${whereClause}
      ${orderBy}
      ${limitOffset}
    `);

    const rows = stmt.all(...params) as SqliteExecutionRow[];
    return rows.map((row) => this.mapRowToEntity(row));
  }

  async findByWorkflowId(
    workflowId: string,
    options?: FindOptions<ExecutionEntity>
  ): Promise<ExecutionEntity[]> {
    const { orderBy, limitOffset } = this.buildQueryClauses(options);

    const stmt = this.db.prepare(`
      SELECT * FROM executions
      WHERE workflow_id = ? AND is_deleted = 0
      ${orderBy}
      ${limitOffset}
    `);

    const rows = stmt.all(workflowId) as SqliteExecutionRow[];
    return rows.map((row) => this.mapRowToEntity(row));
  }

  async findByStatus(
    status: string,
    options?: FindOptions<ExecutionEntity>
  ): Promise<ExecutionEntity[]> {
    const { orderBy, limitOffset } = this.buildQueryClauses(options);

    const stmt = this.db.prepare(`
      SELECT * FROM executions
      WHERE status = ? AND is_deleted = 0
      ${orderBy}
      ${limitOffset}
    `);

    const rows = stmt.all(status) as SqliteExecutionRow[];
    return rows.map((row) => this.mapRowToEntity(row));
  }

  async update(id: string, data: UpdateExecutionData): Promise<ExecutionEntity | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const updates: string[] = ['updated_at = ?'];
    const params: unknown[] = [new Date().toISOString()];

    if (data.status !== undefined) {
      updates.push('status = ?');
      params.push(data.status);
    }
    if (data.startedAt !== undefined) {
      updates.push('started_at = ?');
      params.push(data.startedAt.toISOString());
    }
    if (data.completedAt !== undefined) {
      updates.push('completed_at = ?');
      params.push(data.completedAt.toISOString());
    }
    if (data.totalCost !== undefined) {
      updates.push('total_cost = ?');
      params.push(data.totalCost);
    }
    if (data.costSummary !== undefined) {
      updates.push('cost_summary = ?');
      params.push(JSON.stringify(data.costSummary));
    }
    if (data.nodeResults !== undefined) {
      updates.push('node_results = ?');
      params.push(JSON.stringify(data.nodeResults));
    }
    if (data.error !== undefined) {
      updates.push('error = ?');
      params.push(data.error);
    }
    if (data.queueJobIds !== undefined) {
      updates.push('queue_job_ids = ?');
      params.push(JSON.stringify(data.queueJobIds));
    }

    params.push(id);

    const stmt = this.db.prepare(`
      UPDATE executions SET ${updates.join(', ')} WHERE id = ? AND is_deleted = 0
    `);

    stmt.run(...params);
    return this.findById(id);
  }

  async updateStatus(id: string, status: string, error?: string): Promise<ExecutionEntity | null> {
    return this.update(id, { status: status as ExecutionEntity['status'], error });
  }

  async updateNodeResult(
    executionId: string,
    nodeResult: NodeResultData
  ): Promise<ExecutionEntity | null> {
    const existing = await this.findById(executionId);
    if (!existing) return null;

    const nodeResults = [...existing.nodeResults];
    const existingIndex = nodeResults.findIndex((r) => r.nodeId === nodeResult.nodeId);

    if (existingIndex >= 0) {
      nodeResults[existingIndex] = nodeResult;
    } else {
      nodeResults.push(nodeResult);
    }

    return this.update(executionId, { nodeResults });
  }

  async updateCostSummary(
    id: string,
    costSummary: CostSummaryData
  ): Promise<ExecutionEntity | null> {
    return this.update(id, { costSummary });
  }

  async softDelete(id: string): Promise<ExecutionEntity | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const stmt = this.db.prepare(`
      UPDATE executions SET is_deleted = 1, updated_at = ? WHERE id = ?
    `);

    stmt.run(new Date().toISOString(), id);
    return existing;
  }

  async hardDelete(id: string): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM executions WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  async count(options?: FindOptions<ExecutionEntity>): Promise<number> {
    const { whereClause, params } = this.buildWhereClause(options);

    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM executions WHERE is_deleted = 0 ${whereClause}
    `);

    const result = stmt.get(...params) as { count: number };
    return result.count;
  }

  private mapRowToEntity(row: SqliteExecutionRow): ExecutionEntity {
    return {
      id: row.id,
      workflowId: row.workflow_id,
      status: row.status as ExecutionEntity['status'],
      startedAt: row.started_at ? new Date(row.started_at) : undefined,
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      totalCost: row.total_cost,
      costSummary: JSON.parse(row.cost_summary),
      nodeResults: JSON.parse(row.node_results),
      error: row.error ?? undefined,
      isDeleted: Boolean(row.is_deleted),
      executionMode: row.execution_mode as 'sync' | 'async',
      queueJobIds: JSON.parse(row.queue_job_ids),
      resumedFrom: row.resumed_from ?? undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private buildWhereClause(options?: FindOptions<ExecutionEntity>): {
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

  private buildQueryClauses(options?: FindOptions<ExecutionEntity>): {
    whereClause: string;
    params: unknown[];
    orderBy: string;
    limitOffset: string;
  } {
    const { whereClause, params } = this.buildWhereClause(options);

    let orderBy = 'ORDER BY created_at DESC';
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
