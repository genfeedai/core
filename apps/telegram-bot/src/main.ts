/**
 * GenFeed Telegram Bot — Standalone entry point.
 * Runs on localhost without the cloud. Uses Replicate directly.
 */
import * as Sentry from '@sentry/node';
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createBot } from './bot';
import type { WorkflowJson } from './state';

// ── Sentry ──────────────────────────────────────────────
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 1.0,
    release: `genfeed-telegram-bot@${process.env.VERSION || '1.0.0'}`,
  });
  console.log('📡 Sentry initialized');
}

// ── Config ──────────────────────────────────────────────
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
const ALLOWED_IDS = process.env.TELEGRAM_ALLOWED_USER_IDS;

if (!TELEGRAM_BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN is required. Set it in .env or environment.');
  process.exit(1);
}

if (!REPLICATE_API_TOKEN) {
  console.error('❌ REPLICATE_API_TOKEN is required. Set it in .env or environment.');
  process.exit(1);
}

// Parse allowed user IDs
const allowedUserIds = new Set<number>();
if (ALLOWED_IDS) {
  for (const id of ALLOWED_IDS.split(',')) {
    const parsed = parseInt(id.trim(), 10);
    if (!isNaN(parsed)) allowedUserIds.add(parsed);
  }
  console.log(`🔒 Restricted to user IDs: ${[...allowedUserIds].join(', ')}`);
} else {
  console.log('⚠️  No TELEGRAM_ALLOWED_USER_IDS set — bot is open to everyone');
}

// ── Load Workflows ──────────────────────────────────────
const WORKFLOW_NAMES = [
  'single-image',
  'image-series',
  'image-to-video',
  'single-video',
  'full-pipeline',
  'ugc-factory',
];

const workflows = new Map<string, WorkflowJson>();

// Try loading from the workspace package first, fall back to relative path
const workflowsDir = resolve(__dirname, '../../../packages/workflows/workflows');

for (const name of WORKFLOW_NAMES) {
  try {
    const filePath = join(workflowsDir, `${name}.json`);
    const content = readFileSync(filePath, 'utf-8');
    workflows.set(name, JSON.parse(content));
    console.log(`  ✓ ${name}`);
  } catch {
    console.warn(`  ✗ ${name} (not found)`);
  }
}

console.log(`\n📦 Loaded ${workflows.size}/${WORKFLOW_NAMES.length} workflows`);

if (workflows.size === 0) {
  console.error('❌ No workflows loaded. Check packages/workflows/workflows/ directory.');
  process.exit(1);
}

// ── Start Bot ───────────────────────────────────────────
const bot = createBot(TELEGRAM_BOT_TOKEN, workflows, allowedUserIds);

bot.catch((err) => {
  console.error('Bot error:', err);
  Sentry.captureException(err);
});

bot.start({
  onStart: (botInfo) => {
    console.log(`\n🤖 GenFeed Bot started: @${botInfo.username}`);
    console.log(`   Workflows: ${workflows.size}`);
    console.log(`   Mode: polling`);
    console.log(`   Ready!\n`);
  },
});

// Graceful shutdown
const shutdown = () => {
  console.log('\n🛑 Shutting down...');
  bot.stop();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
