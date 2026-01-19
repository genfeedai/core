import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);

/**
 * Get the path to a workflow JSON file from the @genfeedai/workflows package.
 *
 * This works both:
 * 1. In development (when workflows package is in the monorepo)
 * 2. In production (when workflows package is installed from npm)
 */
export function getWorkflowFilePath(workflowId: string): string | null {
  // Try to resolve from @genfeedai/workflows package
  try {
    // Get the package path
    const workflowsPackagePath = resolvePackagePath('@genfeedai/workflows');
    if (workflowsPackagePath) {
      const workflowFile = join(workflowsPackagePath, 'workflows', `${workflowId}.json`);
      if (existsSync(workflowFile)) {
        return workflowFile;
      }
    }
  } catch {
    // Package resolution failed
  }

  // Fallback: try relative path (for development)
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const devPath = resolve(__dirname, '../../..', 'workflows', 'workflows', `${workflowId}.json`);
  if (existsSync(devPath)) {
    return devPath;
  }

  return null;
}

/**
 * Read workflow JSON from the package
 */
export function readWorkflowFromPackage(workflowId: string): unknown | null {
  const filePath = getWorkflowFilePath(workflowId);
  if (!filePath) {
    return null;
  }

  try {
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Resolve the path to a node package.
 * Uses createRequire for ESM compatibility.
 */
function resolvePackagePath(packageName: string): string | null {
  try {
    const packageJsonPath = require.resolve(`${packageName}/package.json`, {
      paths: [process.cwd()],
    });
    return dirname(packageJsonPath);
  } catch {
    return null;
  }
}
