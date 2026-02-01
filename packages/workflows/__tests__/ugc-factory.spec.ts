import * as fs from 'node:fs';
import * as path from 'node:path';

describe('UGC Factory Workflow', () => {
  let workflow: any;

  beforeAll(() => {
    const filePath = path.resolve(__dirname, '../workflows/ugc-factory.json');
    workflow = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  });

  it('should have valid version', () => {
    expect(workflow.version).toBe(1);
  });

  it('should have correct name', () => {
    expect(workflow.name).toBe('UGC Factory');
  });

  it('should have required node types', () => {
    const nodeTypes = workflow.nodes.map((n: any) => n.type);
    expect(nodeTypes).toContain('prompt');
    expect(nodeTypes).toContain('imageInput');
    expect(nodeTypes).toContain('textToSpeech');
    expect(nodeTypes).toContain('lipSync');
    expect(nodeTypes).toContain('output');
  });

  it('should have valid edges connecting all nodes', () => {
    const nodeIds = new Set(workflow.nodes.map((n: any) => n.id));
    for (const edge of workflow.edges) {
      expect(nodeIds.has(edge.source)).toBe(true);
      expect(nodeIds.has(edge.target)).toBe(true);
    }
  });

  it('should have script → TTS → lipSync → output pipeline', () => {
    const edgeMap = new Map<string, string[]>();
    for (const edge of workflow.edges) {
      if (!edgeMap.has(edge.source)) edgeMap.set(edge.source, []);
      edgeMap.get(edge.source)!.push(edge.target);
    }

    // script-input → tts-1
    expect(edgeMap.get('script-input')).toContain('tts-1');
    // tts-1 → lipSync-1
    expect(edgeMap.get('tts-1')).toContain('lipSync-1');
    // imageInput-1 → lipSync-1
    expect(edgeMap.get('imageInput-1')).toContain('lipSync-1');
    // lipSync-1 → output-1
    expect(edgeMap.get('lipSync-1')).toContain('output-1');
  });

  it('should have TTS node configured with ElevenLabs', () => {
    const ttsNode = workflow.nodes.find((n: any) => n.type === 'textToSpeech');
    expect(ttsNode.data.provider).toBe('elevenlabs');
    expect(ttsNode.data.voice).toBeDefined();
  });
});
