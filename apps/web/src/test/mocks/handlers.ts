import { HttpResponse, http } from 'msw';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://local.genfeed.ai:3001/api';

// Mock data
export const mockWorkflow = {
  _id: 'workflow-123',
  createdAt: new Date().toISOString(),
  description: 'A test workflow',
  edgeStyle: 'bezier',
  edges: [],
  isDeleted: false,
  name: 'Test Workflow',
  nodes: [],
  updatedAt: new Date().toISOString(),
};

export const mockExecution = {
  _id: 'execution-123',
  createdAt: new Date().toISOString(),
  isDeleted: false,
  nodeResults: [],
  startedAt: new Date().toISOString(),
  status: 'pending',
  totalCost: 0,
  updatedAt: new Date().toISOString(),
  workflowId: 'workflow-123',
};

export const mockTemplate = {
  _id: 'template-123',
  category: 'custom',
  createdAt: new Date().toISOString(),
  description: 'A test template',
  edgeStyle: 'bezier',
  edges: [],
  isDeleted: false,
  isSystem: false,
  name: 'Test Template',
  nodes: [],
  updatedAt: new Date().toISOString(),
};

// Replicate API handlers
export const replicateHandlers = [
  // Image generation
  http.post(`${API_BASE_URL}/replicate/image`, () => {
    return HttpResponse.json({
      predictionId: 'mock-img-id',
      status: 'starting',
    });
  }),

  // Video generation
  http.post(`${API_BASE_URL}/replicate/video`, () => {
    return HttpResponse.json({
      predictionId: 'mock-vid-id',
      status: 'starting',
    });
  }),

  // LLM generation
  http.post(`${API_BASE_URL}/replicate/llm`, () => {
    return HttpResponse.json({
      output: 'Generated text from mock LLM',
      status: 'succeeded',
    });
  }),

  // Get prediction status
  http.get(`${API_BASE_URL}/replicate/predictions/:id`, ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      output: ['https://replicate.delivery/mock-output.png'],
      status: 'succeeded',
    });
  }),

  // Cancel prediction
  http.post(`${API_BASE_URL}/replicate/predictions/:id/cancel`, ({ params }) => {
    return HttpResponse.json({
      cancelled: true,
      id: params.id,
    });
  }),
];

// Workflow API handlers
export const workflowHandlers = [
  // Get all workflows
  http.get(`${API_BASE_URL}/workflows`, () => {
    return HttpResponse.json([mockWorkflow]);
  }),

  // Get single workflow
  http.get(`${API_BASE_URL}/workflows/:id`, ({ params }) => {
    return HttpResponse.json({ ...mockWorkflow, _id: params.id });
  }),

  // Create workflow
  http.post(`${API_BASE_URL}/workflows`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ ...mockWorkflow, ...body }, { status: 201 });
  }),

  // Update workflow
  http.patch(`${API_BASE_URL}/workflows/:id`, async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ ...mockWorkflow, _id: params.id, ...body });
  }),

  // Delete workflow
  http.delete(`${API_BASE_URL}/workflows/:id`, ({ params }) => {
    return HttpResponse.json({ ...mockWorkflow, _id: params.id, isDeleted: true });
  }),

  // Duplicate workflow
  http.post(`${API_BASE_URL}/workflows/:id/duplicate`, ({ params }) => {
    return HttpResponse.json({
      ...mockWorkflow,
      _id: 'workflow-duplicate-123',
      name: `${mockWorkflow.name} (Copy)`,
    });
  }),
];

// Execution API handlers
export const executionHandlers = [
  // Get executions for workflow
  http.get(`${API_BASE_URL}/executions`, ({ request }) => {
    const url = new URL(request.url);
    const workflowId = url.searchParams.get('workflowId');
    return HttpResponse.json([{ ...mockExecution, workflowId }]);
  }),

  // Get single execution
  http.get(`${API_BASE_URL}/executions/:id`, ({ params }) => {
    return HttpResponse.json({ ...mockExecution, _id: params.id });
  }),

  // Create execution
  http.post(`${API_BASE_URL}/executions`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ ...mockExecution, ...body }, { status: 201 });
  }),

  // Update execution
  http.patch(`${API_BASE_URL}/executions/:id`, async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ ...mockExecution, _id: params.id, ...body });
  }),

  // Stop execution
  http.post(`${API_BASE_URL}/executions/:id/stop`, ({ params }) => {
    return HttpResponse.json({
      ...mockExecution,
      _id: params.id,
      status: 'stopped',
    });
  }),
];

// Template API handlers
export const templateHandlers = [
  // Get all templates
  http.get(`${API_BASE_URL}/templates`, () => {
    return HttpResponse.json([mockTemplate]);
  }),

  // Get single template
  http.get(`${API_BASE_URL}/templates/:id`, ({ params }) => {
    return HttpResponse.json({ ...mockTemplate, _id: params.id });
  }),

  // Create template
  http.post(`${API_BASE_URL}/templates`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ ...mockTemplate, ...body }, { status: 201 });
  }),

  // Update template
  http.patch(`${API_BASE_URL}/templates/:id`, async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ ...mockTemplate, _id: params.id, ...body });
  }),

  // Delete template
  http.delete(`${API_BASE_URL}/templates/:id`, ({ params }) => {
    return HttpResponse.json({ ...mockTemplate, _id: params.id, isDeleted: true });
  }),
];

// All handlers combined
export const handlers = [
  ...replicateHandlers,
  ...workflowHandlers,
  ...executionHandlers,
  ...templateHandlers,
];
