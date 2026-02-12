# Generate Workflow

Generate a visual node-based workflow based on user requirements.

## User Request
$ARGUMENTS

## Mode
**This command MUST run in plan mode.** Enter plan mode immediately and:
1. Design the workflow structure
2. Present the plan with a visual diagram (ASCII)
3. List all nodes and their connections
4. Wait for user approval before writing any files

## Instructions

This command delegates to the `workflow-creator` skill for node types, handle IDs, default data schemas, and example workflows. Use that skill's reference material.

Additionally:

1. **Enter plan mode** using EnterPlanMode tool
2. **Analyze the request** — Understand what the user wants to accomplish
3. **Use `workflow-creator` skill** — Reference it for node registry, handle types, connection rules, and default data
4. **Design the workflow** — Select nodes, define connections, plan positions (left-to-right, ~300px horizontal, ~200px vertical spacing)
5. **Write the plan** with:
   - ASCII diagram showing the node flow
   - Table of all nodes with their types and purposes
   - Table of all edges with source/target handles
   - The complete TypeScript code that will be generated
6. **Exit plan mode** and wait for user approval

## Execution (After Approval)

1. Create the directory if needed: `apps/web/src/templates/generated/`
2. Write the workflow file to `apps/web/src/templates/generated/[slug].ts`
3. Export with a descriptive constant name
4. Register in `apps/web/src/templates/index.ts`

## Workflow File Structure

```typescript
import type { WorkflowFile } from "@/types/workflow";

export const WORKFLOW_NAME_TEMPLATE: WorkflowFile = {
  version: 1,
  name: "Human-readable name",
  description: "What this workflow does",
  nodes: [...],
  edges: [...],
  edgeStyle: "smoothstep",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
```

## Plan Format Example

```
## Workflow: [Name]

### Flow Diagram
┌─────────┐    ┌─────────┐    ┌─────────┐
│ Prompt  │───▶│   LLM   │───▶│ImageGen │───▶ Output
└─────────┘    └─────────┘    └─────────┘

### Nodes
| ID | Type | Label | Purpose |
|----|------|-------|---------|

### Edges
| Source | Target | Type |
|--------|--------|------|

### Generated Code
[Full TypeScript file content]
```
