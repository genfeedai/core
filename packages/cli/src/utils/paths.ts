import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

/**
 * Resolve the workflows directory path.
 *
 * Priority order:
 * 1. GENFEED_DATA_DIR env variable
 * 2. Config file's workflowsDir setting
 * 3. Project's ./data/workflows directory
 * 4. ~/.local/share/genfeed/workflows (XDG)
 * 5. ~/.genfeed/workflows (fallback)
 */
export function resolveWorkflowsDir(): string {
  // 1. Environment variable
  const envDir = process.env.GENFEED_DATA_DIR;
  if (envDir) {
    const workflowsDir = join(envDir, 'workflows');
    ensureDir(workflowsDir);
    return workflowsDir;
  }

  // 2. Config file
  const configPath = findConfigFile();
  if (configPath) {
    try {
      const config = JSON.parse(readFileSync(configPath, 'utf-8'));
      if (config.workflowsDir) {
        const workflowsDir = resolve(dirname(configPath), config.workflowsDir);
        ensureDir(workflowsDir);
        return workflowsDir;
      }
    } catch {
      // Ignore config parsing errors
    }
  }

  // 3. Project's ./data/workflows
  const projectDir = join(process.cwd(), 'data', 'workflows');
  if (existsSync(join(process.cwd(), 'package.json'))) {
    ensureDir(projectDir);
    return projectDir;
  }

  // 4. XDG data home
  const xdgDataHome = process.env.XDG_DATA_HOME || join(homedir(), '.local', 'share');
  const xdgDir = join(xdgDataHome, 'genfeed', 'workflows');
  if (existsSync(dirname(xdgDir))) {
    ensureDir(xdgDir);
    return xdgDir;
  }

  // 5. Fallback
  const fallbackDir = join(homedir(), '.genfeed', 'workflows');
  ensureDir(fallbackDir);
  return fallbackDir;
}

/**
 * Find the genfeed config file (genfeed.config.json or .genfeedrc)
 */
function findConfigFile(): string | null {
  const possibleNames = ['genfeed.config.json', '.genfeedrc', '.genfeedrc.json'];
  let currentDir = process.cwd();

  while (currentDir !== dirname(currentDir)) {
    for (const name of possibleNames) {
      const configPath = join(currentDir, name);
      if (existsSync(configPath)) {
        return configPath;
      }
    }
    currentDir = dirname(currentDir);
  }

  return null;
}

/**
 * Ensure directory exists
 */
function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * Get the path for a specific workflow file
 */
export function getWorkflowPath(workflowId: string): string {
  const workflowsDir = resolveWorkflowsDir();
  return join(workflowsDir, `${workflowId}.json`);
}
