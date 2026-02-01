import * as fs from 'node:fs';
import * as path from 'node:path';

describe('UGC Factory Workflow v3', () => {
  let workflow: any;

  beforeAll(() => {
    const filePath = path.resolve(__dirname, '../workflows/ugc-factory.json');
    workflow = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  });

  it('should have valid version 3', () => {
    expect(workflow.version).toBe(3);
  });

  it('should have correct name', () => {
    expect(workflow.name).toBe('UGC Factory Pro');
  });

  it('should have all required node types for full pipeline', () => {
    const nodeTypes = workflow.nodes.map((n: any) => n.type);

    // Core UGC nodes
    expect(nodeTypes).toContain('prompt');
    expect(nodeTypes).toContain('imageInput');
    expect(nodeTypes).toContain('textToSpeech');
    expect(nodeTypes).toContain('motionControl');
    expect(nodeTypes).toContain('lipSync');

    // Distribution nodes
    expect(nodeTypes).toContain('telegramPost');
    expect(nodeTypes).toContain('discordPost');
    expect(nodeTypes).toContain('twitterPost');
    expect(nodeTypes).toContain('instagramPost');
    expect(nodeTypes).toContain('tiktokPost');
    expect(nodeTypes).toContain('youtubePost');
    expect(nodeTypes).toContain('googleDriveUpload');
    expect(nodeTypes).toContain('webhookPost');
  });

  it('should have valid edges connecting all nodes', () => {
    const nodeIds = new Set(workflow.nodes.map((n: any) => n.id));
    for (const edge of workflow.edges) {
      expect(nodeIds.has(edge.source)).toBe(true);
      expect(nodeIds.has(edge.target)).toBe(true);
    }
  });

  it('should have complete UGC pipeline: script → TTS → motion → lipSync → distribution (schema-driven)', () => {
    const edgeMap = new Map<string, string[]>();
    for (const edge of workflow.edges) {
      if (!edgeMap.has(edge.source)) edgeMap.set(edge.source, []);
      edgeMap.get(edge.source)!.push(edge.target);
    }

    // script → TTS
    expect(edgeMap.get('script-input')).toContain('tts-voice');

    // avatar → motion control
    expect(edgeMap.get('avatar-input')).toContain('motion-control');

    // motion → lip sync
    expect(edgeMap.get('motion-control')).toContain('lip-sync');

    // TTS → lip sync
    expect(edgeMap.get('tts-voice')).toContain('lip-sync');

    // lip sync → distribution nodes (direct connections)
    const lipSyncTargets = edgeMap.get('lip-sync') || [];
    expect(lipSyncTargets).toContain('telegram-post');
    expect(lipSyncTargets).toContain('discord-post');
    expect(lipSyncTargets).toContain('twitter-post');
    expect(lipSyncTargets).toContain('instagram-post');
    expect(lipSyncTargets).toContain('tiktok-post');
    expect(lipSyncTargets).toContain('youtube-post');
    expect(lipSyncTargets).toContain('google-drive');
  });

  it('should have TTS node configured with ElevenLabs', () => {
    const ttsNode = workflow.nodes.find((n: any) => n.type === 'textToSpeech');
    expect(ttsNode.data.provider).toBe('elevenlabs');
    expect(ttsNode.data.voice).toBe('rachel');
    expect(ttsNode.data.stability).toBe(0.6);
    expect(ttsNode.data.similarityBoost).toBe(0.8);
  });

  it('should have motion control node with trajectory settings', () => {
    const motionNode = workflow.nodes.find((n: any) => n.type === 'motionControl');
    expect(motionNode.data.mode).toBe('video_transfer');
    expect(motionNode.data.duration).toBe(5);
    expect(motionNode.data.aspectRatio).toBe('16:9');
    expect(motionNode.data.trajectory).toBeDefined();
    expect(Array.isArray(motionNode.data.trajectory)).toBe(true);
    expect(motionNode.data.motionStrength).toBe(0.3);
  });

  it('should have platform-specific aspect ratios in distribution nodes', () => {
    const telegramNode = workflow.nodes.find((n: any) => n.type === 'telegramPost');
    expect(telegramNode.data.aspectRatio).toBe('9:16'); // mobile-first

    const twitterNode = workflow.nodes.find((n: any) => n.type === 'twitterPost');
    expect(twitterNode.data.aspectRatio).toBe('16:9'); // desktop-friendly

    const tiktokNode = workflow.nodes.find((n: any) => n.type === 'tiktokPost');
    expect(tiktokNode.data.aspectRatio).toBe('9:16'); // vertical
  });

  it('should have direct video connections to all distribution nodes', () => {
    const edges = workflow.edges;

    // All distribution nodes should receive video directly from lip-sync
    const distributionTargets = [
      'telegram-post',
      'twitter-post',
      'instagram-post',
      'tiktok-post',
      'youtube-post',
    ];

    distributionTargets.forEach((target) => {
      const edge = edges.find(
        (e: any) => e.target === target && e.sourceHandle === 'video' && e.source === 'lip-sync'
      );
      expect(edge).toBeDefined();
    });
  });

  it('should have script input connected to social media caption fields', () => {
    const edgeMap = new Map<string, string[]>();
    for (const edge of workflow.edges) {
      if (!edgeMap.has(edge.source)) edgeMap.set(edge.source, []);
      edgeMap.get(edge.source)!.push(edge.target);
    }

    const scriptTargets = edgeMap.get('script-input') || [];
    expect(scriptTargets).toContain('telegram-post');
    expect(scriptTargets).toContain('discord-post');
    expect(scriptTargets).toContain('twitter-post');
  });

  it('should have webhook notification connected to social media outputs', () => {
    const webhookEdge = workflow.edges.find((e: any) => e.target === 'webhook-notify');
    expect(webhookEdge).toBeDefined();
    expect(webhookEdge.source).toBe('telegram-post');
    expect(webhookEdge.sourceHandle).toBe('url');
  });

  it('should have social media nodes configured with platform-specific settings', () => {
    const tiktokNode = workflow.nodes.find((n: any) => n.type === 'tiktokPost');
    expect(tiktokNode.data.hashtags).toContain('#viral');
    expect(tiktokNode.data.hashtags).toContain('#ai');

    const youtubeNode = workflow.nodes.find((n: any) => n.type === 'youtubePost');
    expect(youtubeNode.data.visibility).toBe('public');
    expect(youtubeNode.data.tags).toContain('AI');

    const instagramNode = workflow.nodes.find((n: any) => n.type === 'instagramPost');
    expect(instagramNode.data.postType).toBe('reels');
  });
});
