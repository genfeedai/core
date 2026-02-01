/**
 * Grammy bot setup, commands, and message handlers.
 */
import { Bot, InlineKeyboard, type Context } from 'grammy';
import {
  getSession,
  setSession,
  deleteSession,
  activeSessionCount,
  extractInputs,
  getUserSettings,
  updateUserImageModel,
  updateUserVideoModel,
  IMAGE_MODELS,
  VIDEO_MODELS,
  type Session,
  type WorkflowJson,
} from './state';
import { executeWorkflow } from './executor';
import { downloadTelegramFile, formatDuration, renderProgressBar } from './utils';

// Callback prefixes
const CB = {
  SELECT: 'wf:',
  RUN: 'confirm:run',
  EDIT: 'confirm:edit',
  CANCEL: 'confirm:cancel',
  SETTINGS_IMAGE: 'settings:image:',
  SETTINGS_VIDEO: 'settings:video:',
  SETTINGS_BACK: 'settings:back',
} as const;

export function createBot(
  token: string,
  workflows: Map<string, WorkflowJson>,
  allowedUserIds: Set<number>
): Bot {
  const bot = new Bot(token);

  // --- Auth middleware ---
  bot.use(async (ctx, next) => {
    const userId = ctx.from?.id;
    if (allowedUserIds.size > 0 && (!userId || !allowedUserIds.has(userId))) {
      await ctx.reply('⛔ You are not authorized to use this bot.');
      return;
    }
    await next();
  });

  // --- /start ---
  bot.command('start', async (ctx) => {
    await ctx.reply(
      '👋 *GenFeed AI Bot*\n\n' +
        'Generate images & videos using AI workflows — right from Telegram.\n\n' +
        '*Commands:*\n' +
        '/workflows — Browse & run workflows\n' +
        '/settings — Configure model preferences\n' +
        '/status — Check current workflow status\n' +
        '/cancel — Cancel current workflow',
      { parse_mode: 'Markdown' }
    );
  });

  // --- /workflows ---
  bot.command('workflows', async (ctx) => {
    const chatId = ctx.chat.id;
    const session = getSession(chatId);
    if (session?.state === 'running') {
      await ctx.reply(
        '⏳ A workflow is running. Use /status to check progress or /cancel to abort.'
      );
      return;
    }

    const keyboard = new InlineKeyboard();
    for (const [id, wf] of workflows) {
      keyboard.text(wf.name, `${CB.SELECT}${id}`).row();
    }

    setSession(chatId, {
      state: 'selecting',
      requiredInputs: [],
      currentInputIndex: 0,
      collectedInputs: new Map(),
      startedAt: Date.now(),
    });

    await ctx.reply('🎬 *GenFeed AI Workflows*\n\nSelect a workflow to run:', {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  });

  // --- /status ---
  bot.command('status', async (ctx) => {
    const chatId = ctx.chat.id;
    const session = getSession(chatId);

    let line = '💤 Idle — no active workflow';
    if (session) {
      const elapsed = formatDuration(Date.now() - session.startedAt);
      switch (session.state) {
        case 'selecting':
          line = '📋 Selecting a workflow';
          break;
        case 'collecting':
          line = `📝 Collecting inputs (${session.currentInputIndex}/${session.requiredInputs.length}) — ${elapsed}`;
          break;
        case 'confirming':
          line = `✅ Waiting for confirmation — ${elapsed}`;
          break;
        case 'running':
          line = `⏳ Running *${session.workflowName}* — ${elapsed}`;
          break;
      }
    }

    await ctx.reply(
      `🤖 *GenFeed Bot Status*\n\n` +
        `📦 Workflows loaded: ${workflows.size}\n` +
        `💬 Active sessions: ${activeSessionCount()}\n` +
        `📍 Your status: ${line}`,
      { parse_mode: 'Markdown' }
    );
  });

  // --- /cancel ---
  bot.command('cancel', async (ctx) => {
    const chatId = ctx.chat.id;
    const session = getSession(chatId);
    if (!session || session.state === 'idle') {
      await ctx.reply('Nothing to cancel.');
      return;
    }
    if (session.state === 'running') {
      // We can't abort a Replicate call mid-flight easily, but we reset state
      deleteSession(chatId);
      await ctx.reply(
        '⚠️ Cancelled. Note: the Replicate job may still complete remotely.\nUse /workflows to start again.'
      );
      return;
    }
    deleteSession(chatId);
    await ctx.reply('❌ Cancelled. Use /workflows to start again.');
  });

  // --- /settings ---
  bot.command('settings', async (ctx) => {
    const chatId = ctx.chat.id;
    const session = getSession(chatId);
    if (session?.state === 'running') {
      await ctx.reply(
        '⏳ A workflow is running. Use /status to check progress or /cancel to abort.'
      );
      return;
    }

    await showSettingsMenu(ctx, chatId);
  });

  // --- Inline keyboard callbacks ---
  bot.on('callback_query:data', async (ctx) => {
    const data = ctx.callbackQuery.data;
    const chatId = ctx.chat!.id;
    await ctx.answerCallbackQuery();

    // Workflow selection
    if (data.startsWith(CB.SELECT)) {
      const existing = getSession(chatId);
      if (existing?.state === 'running') {
        await ctx.reply('⏳ A workflow is already running. Please wait.');
        return;
      }

      const workflowId = data.slice(CB.SELECT.length);
      const workflow = workflows.get(workflowId);
      if (!workflow) {
        await ctx.reply('❌ Workflow not found.');
        return;
      }

      const requiredInputs = extractInputs(workflow);
      setSession(chatId, {
        state: 'collecting',
        workflowId,
        workflowName: workflow.name,
        workflow,
        requiredInputs,
        currentInputIndex: 0,
        collectedInputs: new Map(),
        startedAt: Date.now(),
      });

      await ctx.reply(
        `📋 *${workflow.name}*\n${workflow.description}\n\n` +
          `This workflow needs ${requiredInputs.length} input(s). Let's collect them.`,
        { parse_mode: 'Markdown' }
      );

      await promptNextInput(ctx, chatId);
      return;
    }

    // Confirm run
    if (data === CB.RUN) {
      await handleRun(ctx, chatId, bot.token, workflows);
      return;
    }

    // Edit — restart input collection
    if (data === CB.EDIT) {
      const session = getSession(chatId);
      if (!session) return;
      session.state = 'collecting';
      session.currentInputIndex = 0;
      session.collectedInputs.clear();
      setSession(chatId, session);
      await ctx.reply("🔄 Let's collect inputs again.");
      await promptNextInput(ctx, chatId);
      return;
    }

    // Cancel
    if (data === CB.CANCEL) {
      deleteSession(chatId);
      await ctx.reply('❌ Cancelled. Use /workflows to start again.');
      return;
    }

    // Settings callbacks
    if (data.startsWith(CB.SETTINGS_IMAGE)) {
      const model = data.slice(CB.SETTINGS_IMAGE.length);
      updateUserImageModel(chatId, model);
      await showSettingsMenu(ctx, chatId);
      return;
    }

    if (data.startsWith(CB.SETTINGS_VIDEO)) {
      const model = data.slice(CB.SETTINGS_VIDEO.length);
      updateUserVideoModel(chatId, model);
      await showSettingsMenu(ctx, chatId);
      return;
    }

    if (data === CB.SETTINGS_BACK) {
      await showSettingsMenu(ctx, chatId);
      return;
    }

    if (data === 'settings:show_image') {
      await showImageModels(ctx, chatId);
      return;
    }

    if (data === 'settings:show_video') {
      await showVideoModels(ctx, chatId);
      return;
    }
  });

  // --- Photo handler ---
  bot.on('message:photo', async (ctx) => {
    const chatId = ctx.chat.id;
    const session = getSession(chatId);

    if (!session || session.state !== 'collecting') {
      await ctx.reply('No active input collection. Use /workflows to start.');
      return;
    }

    const currentInput = session.requiredInputs[session.currentInputIndex];
    if (!currentInput || currentInput.inputType !== 'image') {
      await ctx.reply("I'm not expecting an image right now. Please send text.");
      return;
    }

    const photos = ctx.message.photo;
    const bestPhoto = photos[photos.length - 1];

    try {
      const file = await ctx.api.getFile(bestPhoto.file_id);
      const { telegramUrl } = await downloadTelegramFile(
        bot.token,
        file.file_path!,
        chatId,
        currentInput.nodeId
      );

      session.collectedInputs.set(currentInput.nodeId, telegramUrl);
      session.currentInputIndex++;
      setSession(chatId, session);

      await promptNextInput(ctx, chatId);
    } catch (err) {
      console.error('Failed to download photo:', err);
      await ctx.reply('❌ Failed to download the photo. Please try again.');
    }
  });

  // --- Text handler ---
  bot.on('message:text', async (ctx) => {
    const chatId = ctx.chat.id;
    const text = ctx.message.text;

    // Skip commands
    if (text.startsWith('/')) return;

    const session = getSession(chatId);

    if (!session || session.state === 'idle' || session.state === 'selecting') {
      await ctx.reply('No active workflow. Use /workflows to start one.');
      return;
    }

    if (session.state === 'running') {
      await ctx.reply('⏳ Workflow is running. Use /status to check progress.');
      return;
    }

    if (session.state === 'confirming') {
      await ctx.reply('Please use the buttons above to Run, Edit, or Cancel.');
      return;
    }

    if (session.state !== 'collecting') return;

    const currentInput = session.requiredInputs[session.currentInputIndex];
    if (!currentInput || currentInput.inputType !== 'text') {
      await ctx.reply("I'm expecting an image, not text. Please send a photo.");
      return;
    }

    let value = text;
    if (value.toLowerCase() === 'default' && currentInput.defaultValue) {
      value = currentInput.defaultValue;
    }

    session.collectedInputs.set(currentInput.nodeId, value);
    session.currentInputIndex++;
    setSession(chatId, session);

    await promptNextInput(ctx, chatId);
  });

  return bot;
}

// --- Settings helpers ---

async function showSettingsMenu(ctx: Context, chatId: number) {
  const settings = getUserSettings(chatId);

  const keyboard = new InlineKeyboard()
    .text('🖼 Image Models', 'settings:show_image')
    .row()
    .text('🎬 Video Models', 'settings:show_video');

  const message =
    '⚙️ *Model Settings*\n\n' +
    `🖼 Image Model: *${settings.imageModel}*\n` +
    `🎬 Video Model: *${settings.videoModel}*\n\n` +
    'Select a category to change:';

  if (ctx.callbackQuery) {
    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  } else {
    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  }
}

async function showImageModels(ctx: Context, chatId: number) {
  const settings = getUserSettings(chatId);
  const keyboard = new InlineKeyboard();

  for (const model of IMAGE_MODELS) {
    const isSelected = settings.imageModel === model;
    const label = isSelected ? `${model} ✅` : model;
    keyboard.text(label, `${CB.SETTINGS_IMAGE}${model}`).row();
  }
  keyboard.text('⬅️ Back', CB.SETTINGS_BACK);

  await ctx.editMessageText(
    '🖼 *Select Image Model*\n\nChoose your preferred image generation model:',
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    }
  );
}

async function showVideoModels(ctx: Context, chatId: number) {
  const settings = getUserSettings(chatId);
  const keyboard = new InlineKeyboard();

  for (const model of VIDEO_MODELS) {
    const isSelected = settings.videoModel === model;
    const label = isSelected ? `${model} ✅` : model;
    keyboard.text(label, `${CB.SETTINGS_VIDEO}${model}`).row();
  }
  keyboard.text('⬅️ Back', CB.SETTINGS_BACK);

  await ctx.editMessageText(
    '🎬 *Select Video Model*\n\nChoose your preferred video generation model:',
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    }
  );
}

// --- Helpers ---

async function promptNextInput(ctx: Context, chatId: number) {
  const session = getSession(chatId);
  if (!session) return;

  if (session.currentInputIndex >= session.requiredInputs.length) {
    session.state = 'confirming';
    setSession(chatId, session);
    await showConfirmation(ctx, session);
    return;
  }

  const input = session.requiredInputs[session.currentInputIndex];
  const progress = `(${session.currentInputIndex + 1}/${session.requiredInputs.length})`;

  switch (input.inputType) {
    case 'image':
      await ctx.reply(`📸 ${progress} *${input.label}*\nPlease send a photo.`, {
        parse_mode: 'Markdown',
      });
      break;
    case 'text': {
      const hint = input.defaultValue
        ? `\n\n_Default: "${input.defaultValue.substring(0, 100)}${input.defaultValue.length > 100 ? '...' : ''}"_\nSend text or type \`default\` to use it.`
        : '';
      await ctx.reply(`✏️ ${progress} *${input.label}*\nPlease type your text.${hint}`, {
        parse_mode: 'Markdown',
      });
      break;
    }
    case 'audio':
      await ctx.reply(`🎵 ${progress} *${input.label}*\nPlease send an audio file.`, {
        parse_mode: 'Markdown',
      });
      break;
    case 'video':
      await ctx.reply(`🎬 ${progress} *${input.label}*\nPlease send a video.`, {
        parse_mode: 'Markdown',
      });
      break;
  }
}

async function showConfirmation(ctx: Context, session: Session) {
  const chatId = ctx.chat!.id;
  const settings = getUserSettings(chatId);

  let summary = `✅ *Ready to run: ${session.workflowName}*\n\n`;

  // Show inputs
  for (const input of session.requiredInputs) {
    const value = session.collectedInputs.get(input.nodeId);
    if (input.inputType === 'image') {
      summary += `📸 ${input.label}: Image received ✓\n`;
    } else {
      const display = value
        ? value.length > 80
          ? `${value.substring(0, 80)}...`
          : value
        : '(empty)';
      summary += `✏️ ${input.label}: "${display}"\n`;
    }
  }

  // Show current model settings
  summary += `\n🛠 *Model Settings:*\n`;
  summary += `🖼 Image: ${settings.imageModel}\n`;
  summary += `🎬 Video: ${settings.videoModel}\n`;

  const keyboard = new InlineKeyboard()
    .text('▶️ Run', 'confirm:run')
    .text('✏️ Edit', 'confirm:edit')
    .text('❌ Cancel', 'confirm:cancel');

  await ctx.reply(summary, { parse_mode: 'Markdown', reply_markup: keyboard });
}

async function handleRun(
  ctx: Context,
  chatId: number,
  _botToken: string,
  _workflows: Map<string, WorkflowJson>
) {
  const session = getSession(chatId);
  if (!session?.workflow) {
    await ctx.reply('❌ No workflow to run. Use /workflows to start.');
    return;
  }

  session.state = 'running';
  setSession(chatId, session);

  const statusMsg = await ctx.reply(
    `⏳ *Running: ${session.workflowName}*\n\n${renderProgressBar(0)} 0%\n\n🔄 Starting...`,
    { parse_mode: 'Markdown' }
  );
  session.statusMessageId = statusMsg.message_id;
  setSession(chatId, session);

  const settings = getUserSettings(chatId);
  const result = await executeWorkflow(
    session.workflow,
    session.collectedInputs,
    async (message, pct) => {
      try {
        await ctx.api.editMessageText(
          chatId,
          statusMsg.message_id,
          `⏳ *Running: ${session.workflowName}*\n\n${renderProgressBar(pct)} ${pct}%\n\n${message}`,
          { parse_mode: 'Markdown' }
        );
      } catch {
        // Ignore "message not modified" errors
      }
    },
    {
      imageModel: settings.imageModel,
      videoModel: settings.videoModel,
    }
  );

  const duration = formatDuration(result.durationMs);

  if (result.success) {
    await ctx.reply(
      `✅ *Workflow completed!*\n\n` +
        `⏱ Duration: ${duration}\n` +
        `🤖 Model: ${result.modelUsed || 'N/A'}\n` +
        `📦 Outputs: ${result.outputs.length} file(s)`,
      { parse_mode: 'Markdown' }
    );

    for (const output of result.outputs) {
      try {
        const caption = `${output.type === 'image' ? '🖼' : '🎬'} Generated ${output.type} • ${duration} • ${result.modelUsed || ''}`;
        if (output.type === 'image') {
          await ctx.replyWithPhoto(output.url, { caption });
        } else {
          await ctx.replyWithVideo(output.url, { caption });
        }
      } catch {
        await ctx.reply(`📎 Output URL: ${output.url}`);
      }
    }

    if (result.outputs.length === 0) {
      await ctx.reply('⚠️ Workflow completed but produced no output files.');
    }
  } else {
    await ctx.reply(`❌ *Workflow failed*\n\nError: ${result.error}\nDuration: ${duration}`, {
      parse_mode: 'Markdown',
    });
  }

  deleteSession(chatId);
}
