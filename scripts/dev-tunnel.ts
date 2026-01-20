#!/usr/bin/env bun
import ngrok from '@ngrok/ngrok';
import { spawn } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const API_PORT = 3001;
const ENV_FILE = 'apps/api/.env';

function updateEnvFile(url: string): void {
  const fullPath = join(process.cwd(), ENV_FILE);
  if (!existsSync(fullPath)) {
    console.warn(`Warning: ${ENV_FILE} not found, skipping update`);
    return;
  }

  let content = readFileSync(fullPath, 'utf-8');

  if (content.includes('WEBHOOK_BASE_URL=')) {
    content = content.replace(/WEBHOOK_BASE_URL=.*/g, `WEBHOOK_BASE_URL=${url}`);
  } else {
    content += `\nWEBHOOK_BASE_URL=${url}`;
  }

  writeFileSync(fullPath, content);
  console.log(`Updated ${ENV_FILE}`);
}

function waitForApi(): Promise<void> {
  return new Promise((resolve) => {
    const check = async () => {
      try {
        const res = await fetch(`http://localhost:${API_PORT}/api/health`);
        if (res.ok) {
          resolve();
          return;
        }
      } catch {
        // API not ready yet
      }
      setTimeout(check, 500);
    };
    check();
  });
}

async function main(): Promise<void> {
  const authtoken = process.env.NGROK_AUTHTOKEN;
  if (!authtoken) {
    console.error('\n✗ NGROK_AUTHTOKEN not set\n');
    console.error('Setup:');
    console.error('  1. Sign up at https://dashboard.ngrok.com/signup');
    console.error('  2. Get your authtoken at https://dashboard.ngrok.com/get-started/your-authtoken');
    console.error('  3. Add to your shell: export NGROK_AUTHTOKEN=your_token');
    console.error('     Or add to .env.local: NGROK_AUTHTOKEN=your_token\n');
    process.exit(1);
  }

  console.log('Starting ngrok tunnel...');

  let listener: Awaited<ReturnType<typeof ngrok.forward>>;
  try {
    listener = await ngrok.forward({
      addr: API_PORT,
      authtoken_from_env: true,
    });
  } catch (err) {
    console.error('\n✗ Failed to start ngrok tunnel\n');
    console.error((err as Error).message);
    console.error('\nVerify your NGROK_AUTHTOKEN is valid at https://dashboard.ngrok.com/get-started/your-authtoken\n');
    process.exit(1);
  }

  const url = listener.url();
  console.log(`\n✓ Ngrok tunnel: ${url}`);
  console.log(`  Webhook URL:  ${url}/api/replicate/webhook\n`);

  updateEnvFile(url!);

  console.log('Starting API...\n');

  const api = spawn('bun', ['run', 'dev:api'], {
    stdio: 'inherit',
    cwd: process.cwd(),
  });

  console.log('Waiting for API to be ready...');
  await waitForApi();
  console.log('✓ API ready\n');

  console.log('Starting web...\n');

  const web = spawn('bun', ['run', 'dev:web'], {
    stdio: 'inherit',
    cwd: process.cwd(),
  });

  process.on('SIGINT', () => {
    api.kill();
    web.kill();
    ngrok.disconnect();
    process.exit();
  });
}

main();
