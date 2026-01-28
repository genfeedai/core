import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Model, Types } from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ExecutionsModule } from '@/modules/executions.module';
import { WorkflowsModule } from '@/modules/workflows.module';
import { Execution } from '@/schemas/execution.schema';
import { Workflow } from '@/schemas/workflow.schema';

describe('Workflow Execution E2E', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let workflowModel: Model<Workflow>;
  let executionModel: Model<Execution>;

  beforeAll(async () => {
    // Start in-memory MongoDB
    mongod = await MongoMemoryServer.create();
    const mongoUri = mongod.getUri();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              REPLICATE_API_TOKEN: 'test-token',
            }),
          ],
        }),
        MongooseModule.forRoot(mongoUri),
        WorkflowsModule,
        ExecutionsModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    workflowModel = moduleFixture.get<Model<Workflow>>(getModelToken(Workflow.name));
    executionModel = moduleFixture.get<Model<Execution>>(getModelToken(Execution.name));
  });

  afterAll(async () => {
    await app?.close();
    await mongod?.stop();
  });

  beforeEach(async () => {
    // Clean database before each test
    await workflowModel.deleteMany({});
    await executionModel.deleteMany({});
  });

  describe('Workflow CRUD', () => {
    it('should create a workflow', async () => {
      const createDto = {
        name: 'Test Workflow',
        description: 'A test workflow',
        nodes: [
          { id: 'node-1', type: 'prompt', position: { x: 0, y: 0 }, data: { label: 'Prompt' } },
        ],
        edges: [],
        edgeStyle: 'bezier',
      };

      const response = await request(app.getHttpServer())
        .post('/workflows')
        .send(createDto)
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body.name).toBe('Test Workflow');
      expect(response.body.nodes).toHaveLength(1);
    });

    it('should get all workflows', async () => {
      // Create test workflows
      await workflowModel.create([
        { name: 'Workflow 1', nodes: [], edges: [], edgeStyle: 'bezier' },
        { name: 'Workflow 2', nodes: [], edges: [], edgeStyle: 'bezier' },
      ]);

      const response = await request(app.getHttpServer()).get('/workflows').expect(200);

      expect(response.body).toHaveLength(2);
    });

    it('should get workflow by ID', async () => {
      const workflow = await workflowModel.create({
        name: 'Single Workflow',
        nodes: [],
        edges: [],
        edgeStyle: 'bezier',
      });

      const response = await request(app.getHttpServer())
        .get(`/workflows/${workflow._id}`)
        .expect(200);

      expect(response.body.name).toBe('Single Workflow');
    });

    it('should update workflow', async () => {
      const workflow = await workflowModel.create({
        name: 'Original Name',
        nodes: [],
        edges: [],
        edgeStyle: 'bezier',
      });

      const response = await request(app.getHttpServer())
        .put(`/workflows/${workflow._id}`)
        .send({ name: 'Updated Name' })
        .expect(200);

      expect(response.body.name).toBe('Updated Name');
    });

    it('should soft delete workflow', async () => {
      const workflow = await workflowModel.create({
        name: 'To Delete',
        nodes: [],
        edges: [],
        edgeStyle: 'bezier',
      });

      await request(app.getHttpServer()).delete(`/workflows/${workflow._id}`).expect(200);

      // Should not appear in findAll
      const response = await request(app.getHttpServer()).get('/workflows').expect(200);

      expect(response.body).toHaveLength(0);
    });

    it('should return 404 for non-existent workflow', async () => {
      await request(app.getHttpServer()).get('/workflows/507f1f77bcf86cd799439011').expect(404);
    });
  });

  describe('Execution CRUD', () => {
    it('should create an execution for a workflow', async () => {
      const workflow = await workflowModel.create({
        name: 'Execution Test',
        nodes: [{ id: 'node-1', type: 'prompt', position: { x: 0, y: 0 }, data: {} }],
        edges: [],
        edgeStyle: 'bezier',
      });

      const response = await request(app.getHttpServer())
        .post(`/workflows/${workflow._id}/execute`)
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body.status).toBe('pending');
      expect(response.body.workflowId.toString()).toBe((workflow._id as Types.ObjectId).toString());
    });

    it('should get executions for a workflow', async () => {
      const workflow = await workflowModel.create({
        name: 'Execution Test',
        nodes: [],
        edges: [],
        edgeStyle: 'bezier',
      });

      await executionModel.create([
        { workflowId: workflow._id, status: 'completed', nodeResults: [] },
        { workflowId: workflow._id, status: 'failed', nodeResults: [] },
      ]);

      const response = await request(app.getHttpServer())
        .get(`/workflows/${workflow._id}/executions`)
        .expect(200);

      expect(response.body).toHaveLength(2);
    });

    it('should get single execution by ID', async () => {
      const workflow = await workflowModel.create({
        name: 'Test',
        nodes: [],
        edges: [],
        edgeStyle: 'bezier',
      });

      const execution = await executionModel.create({
        workflowId: workflow._id,
        status: 'running',
        nodeResults: [],
      });

      const response = await request(app.getHttpServer())
        .get(`/executions/${execution._id}`)
        .expect(200);

      expect(response.body.status).toBe('running');
    });
  });

  describe('Database queries', () => {
    it('should respect isDeleted filter', async () => {
      await workflowModel.create([
        { name: 'Active', nodes: [], edges: [], edgeStyle: 'bezier', isDeleted: false },
        { name: 'Deleted', nodes: [], edges: [], edgeStyle: 'bezier', isDeleted: true },
      ]);

      const response = await request(app.getHttpServer()).get('/workflows').expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe('Active');
    });
  });
});
