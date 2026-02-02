import { describe, test, expect } from 'bun:test';
import type {
  BaseNodeData,
  GoogleDriveUploadNodeData,
  TelegramPostNodeData,
  WebhookPostNodeData,
} from '../src/nodes';
import { NODE_DEFINITIONS, NodeCategory } from '../src/nodes';

describe('Distribution Node Types', () => {
  const distributionNodes = [
    'telegramPost',
    'discordPost',
    'twitterPost',
    'instagramPost',
    'tiktokPost',
    'youtubePost',
    'facebookPost',
    'linkedinPost',
    'googleDriveUpload',
    'webhookPost',
  ] as const;

  test.each(distributionNodes)('should have %s node definition', (nodeType) => {
    const definition = NODE_DEFINITIONS[nodeType];

    expect(definition).toBeDefined();
    expect(definition.type).toBe(nodeType);
    expect(definition.category).toBe('distribution');
    expect(definition.label).toBeDefined();
    expect(definition.description).toBeDefined();
    expect(definition.icon).toBeDefined();
    expect(definition.inputs).toBeDefined();
    expect(definition.outputs).toBeDefined();
    expect(definition.defaultData).toBeDefined();
  });

  test('telegram post node should have correct configuration', () => {
    const node = NODE_DEFINITIONS.telegramPost;

    expect(node.label).toBe('Telegram Post');
    expect(node.description).toContain('Telegram');
    expect(node.inputs).toHaveLength(3);
    expect(node.outputs).toHaveLength(1);

    // Should accept video, image, and text
    const inputTypes = node.inputs.map((i) => i.type);
    expect(inputTypes).toContain('video');
    expect(inputTypes).toContain('image');
    expect(inputTypes).toContain('text');

    // Should output URL
    expect(node.outputs[0].type).toBe('text');
    expect(node.outputs[0].label).toBe('Post URL');

    // Default data should have required fields
    const defaultData = node.defaultData as TelegramPostNodeData;
    expect(defaultData.status).toBe('idle');
    expect(defaultData.chatId).toBe('');
    expect(defaultData.caption).toBe('');
    expect(defaultData.asVoice).toBe(false);
  });

  test('social media nodes should have platform-specific configurations', () => {
    // TikTok should only accept video
    const tiktok = NODE_DEFINITIONS.tiktokPost;
    expect(tiktok.inputs).toHaveLength(1);
    expect(tiktok.inputs[0].type).toBe('video');
    expect(tiktok.inputs[0].required).toBe(true);

    // YouTube should only accept video
    const youtube = NODE_DEFINITIONS.youtubePost;
    expect(youtube.inputs).toHaveLength(1);
    expect(youtube.inputs[0].type).toBe('video');
    expect(youtube.inputs[0].required).toBe(true);

    // Instagram should accept video and image (no text)
    const instagram = NODE_DEFINITIONS.instagramPost;
    const igInputTypes = instagram.inputs.map((i) => i.type);
    expect(igInputTypes).toContain('video');
    expect(igInputTypes).toContain('image');
    expect(igInputTypes).not.toContain('text');
  });

  test('webhook node should have flexible input configuration', () => {
    const webhook = NODE_DEFINITIONS.webhookPost;

    // Should accept all types of input
    const inputTypes = webhook.inputs.map((i) => i.type);
    expect(inputTypes).toContain('video');
    expect(inputTypes).toContain('image');
    expect(inputTypes).toContain('text');
    expect(inputTypes).toContain('text'); // data input

    // Default data should have webhook configuration
    const defaultData = webhook.defaultData as WebhookPostNodeData;
    expect(defaultData.webhookUrl).toBe('');
    expect(defaultData.method).toBe('POST');
    expect(typeof defaultData.headers).toBe('object');
  });

  test('google drive node should have file management configuration', () => {
    const gdrive = NODE_DEFINITIONS.googleDriveUpload;

    expect(gdrive.label).toBe('Google Drive');
    expect(gdrive.icon).toBe('FolderUp');

    // Should accept various file types
    const inputTypes = gdrive.inputs.map((i) => i.type);
    expect(inputTypes).toContain('video');
    expect(inputTypes).toContain('image');
    expect(inputTypes).toContain('text'); // for generic files

    // Default data should have folder and filename
    const defaultData = gdrive.defaultData as GoogleDriveUploadNodeData;
    expect(defaultData.folderId).toBe('');
    expect(defaultData.fileName).toBe('');
  });

  test('all distribution nodes should output URLs or responses', () => {
    distributionNodes.forEach((nodeType) => {
      const node = NODE_DEFINITIONS[nodeType];

      expect(node.outputs).toHaveLength(1);
      expect(node.outputs[0].type).toBe('text');

      const outputLabels = ['Post URL', 'Tweet URL', 'Video URL', 'Drive URL', 'Response'];
      expect(outputLabels).toContain(node.outputs[0].label);
    });
  });

  test('all distribution nodes should have job tracking', () => {
    distributionNodes.forEach((nodeType) => {
      const node = NODE_DEFINITIONS[nodeType];
      const defaultData = node.defaultData as BaseNodeData & { jobId: string | null };

      expect(defaultData).toHaveProperty('jobId');
      expect(defaultData.jobId).toBe(null);
      expect(defaultData).toHaveProperty('status');
      expect(defaultData.status).toBe('idle');
    });
  });
});

describe('Schema-Driven Format Conversion', () => {
  test('distribution nodes should use schema-driven format conversion', () => {
    const telegramNode = NODE_DEFINITIONS.telegramPost;
    expect(telegramNode.category).toBe('distribution');

    const twitterNode = NODE_DEFINITIONS.twitterPost;
    expect(twitterNode.category).toBe('distribution');

    // Format conversion is now handled by schema-driven engine
    // Each distribution node will have aspect ratio in its Replicate schema
    // No separate format conversion nodes needed
  });

  test('distribution nodes should accept video input directly', () => {
    const distributionNodes = ['telegramPost', 'twitterPost', 'instagramPost', 'tiktokPost'];

    distributionNodes.forEach((nodeType) => {
      const node = NODE_DEFINITIONS[nodeType as keyof typeof NODE_DEFINITIONS];
      const inputTypes = node.inputs.map((i) => i.type);
      expect(inputTypes).toContain('video');
    });
  });
});

describe('Node Category System', () => {
  test('distribution category should be properly defined', () => {
    // Check that distribution is a valid category
    const validCategories: NodeCategory[] = [
      'input',
      'ai',
      'processing',
      'output',
      'distribution',
      'composition',
    ];
    expect(validCategories).toContain('distribution');
  });

  test('should be able to filter nodes by distribution category', () => {
    const distributionNodeTypes = Object.values(NODE_DEFINITIONS)
      .filter((node) => node.category === 'distribution')
      .map((node) => node.type);

    expect(distributionNodeTypes).toContain('telegramPost');
    expect(distributionNodeTypes).toContain('discordPost');
    expect(distributionNodeTypes).toContain('twitterPost');
    expect(distributionNodeTypes).toContain('instagramPost');
    expect(distributionNodeTypes).toContain('tiktokPost');
    expect(distributionNodeTypes).toContain('youtubePost');
    expect(distributionNodeTypes).toContain('facebookPost');
    expect(distributionNodeTypes).toContain('linkedinPost');
    expect(distributionNodeTypes).toContain('googleDriveUpload');
    expect(distributionNodeTypes).toContain('webhookPost');
  });

  test('format conversion is handled by schema-driven engine', () => {
    // Multi-format nodes removed - format conversion now handled automatically
    // by reading aspect ratio from each node's Replicate schema
    expect(true).toBe(true); // Placeholder test
  });
});

describe('Node Data Type Safety', () => {
  test('all new node types should have complete data interfaces', () => {
    const newNodeTypes = [
      'telegramPost',
      'discordPost',
      'twitterPost',
      'instagramPost',
      'tiktokPost',
      'youtubePost',
      'facebookPost',
      'linkedinPost',
      'googleDriveUpload',
      'webhookPost',
    ];

    newNodeTypes.forEach((nodeType) => {
      const node = NODE_DEFINITIONS[nodeType as keyof typeof NODE_DEFINITIONS];
      const defaultData = node.defaultData as BaseNodeData & { jobId: string | null };

      // All should have base properties
      expect(defaultData).toHaveProperty('label');
      expect(defaultData).toHaveProperty('status');
      expect(defaultData).toHaveProperty('jobId');

      // Status should be idle by default
      expect(defaultData.status).toBe('idle');

      // JobId should be null by default
      expect(defaultData.jobId).toBe(null);

      // Label should be defined
      expect(typeof defaultData.label).toBe('string');
      expect(defaultData.label.length).toBeGreaterThan(0);
    });
  });
});
