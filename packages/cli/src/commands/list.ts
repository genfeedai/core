import { getWorkflowIds, getWorkflowMetadata } from '@genfeedai/workflows';
import pc from 'picocolors';
import { logger } from '../utils/logger';

/**
 * List all available workflow templates
 */
export async function listCommand(): Promise<void> {
  const workflowIds = getWorkflowIds();

  logger.title('Available Workflow Templates');
  logger.newline();

  if (workflowIds.length === 0) {
    logger.warn('No workflows found');
    return;
  }

  // Group by category
  const byCategory = new Map<string, typeof workflowIds>();

  for (const id of workflowIds) {
    const metadata = getWorkflowMetadata(id);
    if (!metadata) continue;

    const category = metadata.category;
    if (!byCategory.has(category)) {
      byCategory.set(category, []);
    }
    byCategory.get(category)?.push(id);
  }

  // Display workflows by category
  for (const [category, ids] of byCategory) {
    console.log(pc.bold(pc.cyan(`  ${category.toUpperCase()}`)));

    for (const id of ids) {
      const metadata = getWorkflowMetadata(id);
      if (!metadata) continue;

      console.log(`    ${pc.green(id.padEnd(20))} ${pc.dim(metadata.description)}`);
    }
    logger.newline();
  }

  logger.dim(`  Run ${pc.cyan('genfeed info <name>')} for more details`);
  logger.dim(`  Run ${pc.cyan('genfeed add <name>')} to download a workflow`);
  logger.newline();
}
