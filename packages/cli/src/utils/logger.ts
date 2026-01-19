import pc from 'picocolors';

/**
 * Colored console logger for CLI output
 */
export const logger = {
  info: (message: string) => {
    console.log(pc.blue('info'), message);
  },

  success: (message: string) => {
    console.log(pc.green('success'), message);
  },

  warn: (message: string) => {
    console.log(pc.yellow('warn'), message);
  },

  error: (message: string) => {
    console.log(pc.red('error'), message);
  },

  dim: (message: string) => {
    console.log(pc.dim(message));
  },

  bold: (message: string) => {
    console.log(pc.bold(message));
  },

  title: (message: string) => {
    console.log();
    console.log(pc.cyan(pc.bold(message)));
    console.log(pc.dim('─'.repeat(40)));
  },

  item: (label: string, value: string) => {
    console.log(`  ${pc.dim(label + ':')} ${value}`);
  },

  newline: () => {
    console.log();
  },
};
