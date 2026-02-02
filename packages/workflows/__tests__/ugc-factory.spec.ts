import * as fs from 'node:fs';
import * as path from 'node:path';
import type {
  InstagramPostNodeData,
  MotionControlNodeData,
  NodeType,
  TextToSpeechNodeData,
  TikTokPostNodeData,
  WorkflowNode,
  YouTubePostNodeData,
} from '@genfeedai/types';
import type { WorkflowJson } from '../src';

describe('UGC Factory Workflow v3', () => {
  let workflow: WorkflowJson;

  const getNodeData = <TData>(nodes: WorkflowNode[], nodeType: NodeType): TData => {
    const node = nodes.find((n) => n.type === nodeType);
    expect(node).toBeDefined();
    return (node as { data: TData }).data;
  };

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
    const nodeTypes = workflow.nodes.map((node) => node.type);

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
    const nodeIds = new Set(workflow.nodes.map((node) => node.id));
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
    const ttsData = getNodeData<TextToSpeechNodeData>(workflow.nodes, 'textToSpeech');
    expect(ttsData.provider).toBe('elevenlabs');
    expect(ttsData.voice).toBe('rachel');
    expect(ttsData.stability).toBe(0.6);
    expect(ttsData.similarityBoost).toBe(0.8);
  });

  it('should have motion control node with trajectory settings', () => {
    const motionData = getNodeData<MotionControlNodeData>(workflow.nodes, 'motionControl');
    expect(motionData.mode).toBe('video_transfer');
    expect(motionData.duration).toBe(5);
    expect(motionData.aspectRatio).toBe('16:9');
    expect(motionData.trajectory).toBeDefined();
    expect(Array.isArray(motionData.trajectory)).toBe(true);
    expect(motionData.motionStrength).toBe(0.3);
  });

  it('should have platform-specific aspect ratios in distribution nodes', () => {
    const telegramData = getNodeData<{ aspectRatio: string }>(workflow.nodes, 'telegramPost');
    expect(telegramData.aspectRatio).toBe('9:16'); // mobile-first

    const twitterData = getNodeData<{ aspectRatio: string }>(workflow.nodes, 'twitterPost');
    expect(twitterData.aspectRatio).toBe('16:9'); // desktop-friendly

    const tiktokData = getNodeData<{ aspectRatio: string }>(workflow.nodes, 'tiktokPost');
    expect(tiktokData.aspectRatio).toBe('9:16'); // vertical
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
        (edge) =>
          edge.target === target && edge.sourceHandle === 'video' && edge.source === 'lip-sync'
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
    const webhookEdge = workflow.edges.find((edge) => edge.target === 'webhook-notify');
    expect(webhookEdge).toBeDefined();
    if (webhookEdge) {
      expect(webhookEdge.source).toBe('telegram-post');
      expect(webhookEdge.sourceHandle).toBe('url');
    }
  });

  it('should have social media nodes configured with platform-specific settings', () => {
    const tiktokData = getNodeData<TikTokPostNodeData>(workflow.nodes, 'tiktokPost');
    expect(tiktokData.hashtags).toContain('#viral');
    expect(tiktokData.hashtags).toContain('#ai');

    const youtubeData = getNodeData<YouTubePostNodeData>(workflow.nodes, 'youtubePost');
    expect(youtubeData.visibility).toBe('public');
    expect(youtubeData.tags).toContain('AI');

    const instagramData = getNodeData<InstagramPostNodeData>(workflow.nodes, 'instagramPost');
    expect(instagramData.postType).toBe('reels');
  });
});
