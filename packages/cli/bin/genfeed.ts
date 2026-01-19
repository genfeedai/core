#!/usr/bin/env node
import { Command } from 'commander';
import pc from 'picocolors';
import { addCommand } from '../src/commands/add';
import { infoCommand } from '../src/commands/info';
import { listCommand } from '../src/commands/list';

const program = new Command();

program
  .name('genfeed')
  .description('CLI tool to download and manage Genfeed workflow templates')
  .version('0.1.0');

program
  .command('list')
  .description('List all available workflow templates')
  .action(async () => {
    await listCommand();
  });

program
  .command('info <name>')
  .description('Show detailed information about a workflow')
  .action(async (name: string) => {
    await infoCommand(name);
  });

program
  .command('add <name>')
  .description('Download and install a workflow template')
  .option('-f, --force', 'Overwrite existing workflow without prompting')
  .option('-o, --output <path>', 'Custom output path for the workflow file')
  .action(async (name: string, options: { force?: boolean; output?: string }) => {
    await addCommand(name, options);
  });

// Default command: show help
program.action(() => {
  console.log();
  console.log(pc.cyan(pc.bold('  Genfeed CLI')));
  console.log(pc.dim('  Download and manage workflow templates'));
  console.log();
  program.outputHelp();
});

program.parse();
