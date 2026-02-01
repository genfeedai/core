import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { getWorkflowMetadata } from '@genfeedai/workflows';
import ora from 'ora';
import pc from 'picocolors';
import prompts from 'prompts';
import { logger } from '../utils/logger';
import { readWorkflowFromPackage } from '../utils/npm';
import { getWorkflowPath, resolveWorkflowsDir } from '../utils/paths';
import { validateWorkflow } from '../utils/validation';

interface AddOptions {
  force?: boolean;
  output?: string;
}

/**
 * Download and install a workflow template
 */
export async function addCommand(workflowId: string, options: AddOptions): Promise<void> {
  const spinner = ora();

  // Check if workflow exists in registry
  const metadata = getWorkflowMetadata(workflowId);
  if (!metadata) {
    logger.error(`Workflow "${workflowId}" not found`);
    logger.dim('Run "genfeed list" to see available workflows');
    process.exit(1);
  }

  logger.title(`Adding "${metadata.title}"`);

  // Determine output path
  const outputPath = options.output || getWorkflowPath(workflowId);
  const workflowsDir = resolveWorkflowsDir();

  logger.item('Workflows directory', workflowsDir);
  logger.item('Output file', outputPath);
  logger.newline();

  // Check if file already exists
  if (existsSync(outputPath) && !options.force) {
    const { overwrite } = await prompts({
      type: 'confirm',
      name: 'overwrite',
      message: `Workflow "${workflowId}.json" already exists. Overwrite?`,
      initial: false,
    });

    if (!overwrite) {
      logger.warn('Aborted');
      return;
    }
  }

  // Fetch workflow from package
  spinner.start('Fetching workflow...');

  const workflow = readWorkflowFromPackage(workflowId);
  if (!workflow) {
    spinner.fail('Failed to fetch workflow');
    logger.error('Could not read workflow from @genfeedai/workflows package');
    process.exit(1);
  }

  spinner.succeed('Workflow fetched');

  // Validate workflow
  spinner.start('Validating workflow...');

  const validation = validateWorkflow(workflow);
  if (!validation.valid) {
    spinner.fail('Workflow validation failed');
    for (const error of validation.errors) {
      logger.error(`  ${error}`);
    }
    process.exit(1);
  }

  spinner.succeed('Workflow validated');

  // Write workflow to file
  spinner.start('Saving workflow...');

  try {
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, JSON.stringify(workflow, null, 2));
    spinner.succeed('Workflow saved');
  } catch (error) {
    spinner.fail('Failed to save workflow');
    logger.error(error instanceof Error ? error.message : 'Unknown error occurred');
    process.exit(1);
  }

  // Success message
  logger.newline();
  logger.success(`Workflow "${metadata.title}" added successfully!`);
  logger.newline();

  console.log(pc.dim('  To use this workflow:'));
  console.log(pc.dim(`    1. Open Genfeed app`));
  console.log(pc.dim(`    2. Click "Import Workflow" in the toolbar`));
  console.log(pc.dim(`    3. Select ${pc.cyan(outputPath)}`));
  logger.newline();
}
