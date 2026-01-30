# Avatar Workflow - Talking Head Video Generation

## Overview

The Avatar Workflow enables generating talking head videos from a static image and text/audio input. This feature combines Text-to-Speech (TTS) and Lip Sync AI models to create realistic avatar videos.

## Status

**Implemented:** 2026-01-18

## Architecture

### Complete Workflow

```
Prompt Node ──→ Text to Speech ──→ Audio
                                     ↓
Image Input ────────────────────→ Lip Sync ──→ Talking Head Video
```

### Alternative Workflow (Pre-recorded Audio)

```
Audio Input ──────────────────→ Lip Sync ──→ Talking Head Video
                                    ↑
Image Input ────────────────────────┘
```

## Components

### 1. Text to Speech Node (`textToSpeech`)

**Location:** `apps/web/src/components/nodes/ai/TextToSpeechNode.tsx`

**Features:**
- Provider selection (ElevenLabs, OpenAI)
- 40+ voice options with descriptions
- Voice customization:
  - Stability (0-100%)
  - Clarity/Similarity Boost (0-100%)
  - Speed (0.5x - 2x)
- Audio output player with regenerate

**Inputs:**
- `text` (required) - Text to convert to speech

**Outputs:**
- `audio` - Generated speech audio

**Configuration Required:**
- API: `ELEVENLABS_API_KEY` in `.env`
- Web: `NEXT_PUBLIC_TTS_ENABLED=true` in `.env.local`

### 2. Lip Sync Node (`lipSync`)

**Location:** `apps/web/src/components/nodes/ai/LipSyncNode.tsx`

**Supported Models:**
| Model | Provider | Quality |
|-------|----------|---------|
| `sync/lipsync-2-pro` | Sync Labs | Highest |
| `sync/lipsync-2` | Sync Labs | High |
| `bytedance/latentsync` | ByteDance | Good |
| `pixverse/lipsync` | Pixverse | Good |

**Inputs:**
- `image` (optional) - Face image to animate
- `video` (optional) - Source video with face
- `audio` (required) - Speech audio to sync

Note: Provide either `image` OR `video`, not both.

**Outputs:**
- `video` - Lip-synced talking head video

**Options:**
- Model selection
- Sync Mode (loop, bounce, cut_off, silence, remap) - Sync Labs only
- Temperature (0-1)
- Active Speaker Detection - Sync Labs only

### 3. Voice Change Node (`voiceChange`)

**Location:** `apps/web/src/components/nodes/ai/VoiceChangeNode.tsx`

**Purpose:** Replace or mix audio track in existing video

**Inputs:**
- `video` (required) - Source video
- `audio` (required) - New audio track

**Outputs:**
- `video` - Video with replaced/mixed audio

**Options:**
- Preserve original audio toggle
- Audio mix level (0-100%)

## Backend Services

### TTS Service

**Location:** `apps/api/src/tts/tts.service.ts`

Handles ElevenLabs API integration for text-to-speech generation.

### Replicate Integration

**Location:** `apps/api/src/replicate/replicate.service.ts`

- `generateLipSync()` - Calls Replicate lip-sync models

### Queue Processing

**Location:** `apps/api/src/queue/processors/processing.processor.ts`

Handles:
- `lipSync` - Async lip-sync generation via Replicate
- `textToSpeech` - Direct TTS via ElevenLabs (no polling needed)
- `voiceChange` - FFmpeg audio replacement

## Configuration

### API Environment (.env)

```bash
# ElevenLabs Text-to-Speech
ELEVENLABS_API_KEY=your_api_key_here
```

### Web Environment (.env.local)

```bash
# Enable TTS in UI (set to true when API key is configured)
NEXT_PUBLIC_TTS_ENABLED=true
```

## Type Definitions

### packages/types/src/nodes.ts

```typescript
// TTS Types
type TTSProvider = 'elevenlabs' | 'openai';
type TTSVoice = 'rachel' | 'drew' | 'clyde' | ... ;

interface TextToSpeechNodeData extends BaseNodeData {
  inputText: string | null;
  outputAudio: string | null;
  provider: TTSProvider;
  voice: TTSVoice;
  stability: number;
  similarityBoost: number;
  speed: number;
  jobId: string | null;
}

// Lip Sync Types
type LipSyncModel = 'sync/lipsync-2-pro' | 'sync/lipsync-2' | 'bytedance/latentsync' | 'pixverse/lipsync';
type LipSyncMode = 'loop' | 'bounce' | 'cut_off' | 'silence' | 'remap';

interface LipSyncNodeData extends BaseNodeData {
  inputImage: string | null;
  inputVideo: string | null;
  inputAudio: string | null;
  outputVideo: string | null;
  model: LipSyncModel;
  syncMode: LipSyncMode;
  temperature: number;
  activeSpeaker: boolean;
  jobId: string | null;
}

// Voice Change Types
interface VoiceChangeNodeData extends BaseNodeData {
  inputVideo: string | null;
  inputAudio: string | null;
  outputVideo: string | null;
  preserveOriginalAudio: boolean;
  audioMixLevel: number;
  jobId: string | null;
}
```

## Files Modified/Created

### New Files
- `apps/api/src/tts/tts.service.ts`
- `apps/api/src/tts/tts.module.ts`
- `apps/web/src/components/nodes/ai/LipSyncNode.tsx`
- `apps/web/src/components/nodes/ai/VoiceChangeNode.tsx`
- `apps/web/src/components/nodes/ai/TextToSpeechNode.tsx`

### Modified Files
- `packages/types/src/nodes.ts` - Added TTS types and NODE_DEFINITIONS
- `apps/api/src/replicate/replicate.service.ts` - Added lip-sync models and generateLipSync()
- `apps/api/src/queue/processors/processing.processor.ts` - Added lipSync, textToSpeech cases
- `apps/api/src/queue/interfaces/job-data.interface.ts` - Added job interfaces
- `apps/api/src/queue/queue.constants.ts` - Added queue routing
- `apps/api/src/queue/queue.module.ts` - Added TTSModule import
- `apps/api/src/app.module.ts` - Added TTSModule
- `apps/web/src/components/nodes/ai/index.ts` - Exported new nodes
- `apps/web/src/components/nodes/index.ts` - Added to nodeTypes
- `apps/web/src/components/nodes/BaseNode.tsx` - Added icons (Mic, AudioLines, Volume2)
- `apps/web/src/store/executionStore.ts` - Handle new node types

## Usage Example

1. Add **Prompt** node with script text
2. Connect to **Text to Speech** node, select voice
3. Add **Image Input** node with face photo
4. Connect both to **Lip Sync** node
5. Connect to **Output** node
6. Execute workflow

## Costs

| Operation | Model | Approximate Cost |
|-----------|-------|------------------|
| TTS | ElevenLabs | ~$0.30 per 1,000 chars |
| Lip Sync | sync/lipsync-2-pro | See Replicate pricing |
| Lip Sync | sync/lipsync-2 | See Replicate pricing |
| Lip Sync | bytedance/latentsync | See Replicate pricing |

## Future Enhancements

- [ ] OpenAI TTS provider support
- [ ] Voice cloning (ElevenLabs Voice Lab)
- [ ] Avatar generation (HeyGen, D-ID, Synthesia)
- [ ] Expression/emotion control
- [ ] Batch processing for long scripts
