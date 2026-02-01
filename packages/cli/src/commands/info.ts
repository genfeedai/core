import { getWorkflowMetadata } from '@genfeedai/workflows';
import pc from 'picocolors';
import { logger } from '../utils/logger';
import { readWorkflowFromPackage } from '../utils/npm';
import type { WorkflowFile } from '../utils/validation';

/**
 * Show detailed information about a workflow template
 */
export async function infoCommand(workflowId: string): Promise<void> {
  const metadata = getWorkflowMetadata(workflowId);

  if (!metadata) {
    logger.error(`Workflow "${workflowId}" not found`);
    logger.dim('Run "genfeed list" to see available workflows');
    process.exit(1);
  }

  logger.title(metadata.title);

  logger.item('ID', pc.green(metadata.slug));
  logger.item('Category', metadata.category);
  logger.item('Version', String(metadata.version));
  logger.item('Description', metadata.description);
  logger.item('Tags', metadata.tags.join(', '));

  // Try to read the actual workflow file for more details
  const workflow = readWorkflowFromPackage(workflowId) as WorkflowFile | null;

  if (workflow) {
    logger.newline();
    console.log(pc.dim('─'.repeat(40)));
    logger.newline();

    const nodeTypes = new Set(workflow.nodes.map((n) => n.type));
    logger.item('Node count', String(workflow.nodes.length));
    logger.item('Edge count', String(workflow.edges.length));
    logger.item('Node types', [...nodeTypes].join(', '));

    // Show workflow structure
    logger.newline();
    console.log(pc.bold('  Workflow Structure:'));

    const inputNodes = workflow.nodes.filter(
      (n) => n.type === 'imageInput' || n.type === 'videoInput' || n.type === 'prompt'
    );
    const outputNodes = workflow.nodes.filter((n) => n.type === 'output' || n.type === 'preview');

    console.log(
      `    ${pc.blue('Inputs:')} ${inputNodes.map((n) => n.data.label || n.type).join(' → ')}`
    );
    console.log(
      `    ${pc.green('Outputs:')} ${outputNodes.map((n) => n.data.label || n.type).join(' → ')}`
    );
  }

  logger.newline();
  logger.dim(`  Run ${pc.cyan(`genfeed add ${workflowId}`)} to download this workflow`);
  logger.newline();
}
