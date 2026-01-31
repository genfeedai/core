# UGC Factory Implementation Plan

## 🚀 Building on GenFeed Infrastructure

Based on the existing GenFeed codebase analysis, here's how we'll implement the UGC Factory:

## 📁 Implementation Structure

```
/apps/api/src/
├── modules/ugc-factory.module.ts
├── services/ugc-factory.service.ts
├── dto/create-ugc-batch.dto.ts
├── processors/
│   ├── ugc-script-processor.ts
│   ├── ugc-tts-processor.ts  
│   ├── ugc-motion-processor.ts
│   ├── ugc-lipsync-processor.ts
│   └── ugc-distribution-processor.ts
└── nodes/
    ├── ugc-script-node.ts
    ├── ugc-tts-node.ts
    ├── ugc-motion-node.ts
    ├── ugc-lipsync-node.ts
    └── distribution/
        ├── telegram-output-node.ts
        ├── discord-output-node.ts
        ├── twitter-output-node.ts
        ├── instagram-output-node.ts
        ├── tiktok-output-node.ts
        ├── youtube-output-node.ts
        └── google-drive-output-node.ts
```

## 🎯 Core Implementation Steps

### Day 1-2: Core Workflow Foundation

**1. Create UGC Factory Module**
```typescript
// modules/ugc-factory.module.ts
@Module({
  imports: [
    BullModule.registerQueue({ name: 'ugc-factory' }),
    // Import existing modules we'll reuse
    TTSModule,
    ReplicateModule,
  ],
  providers: [
    UGCFactoryService,
    UGCScriptProcessor,
    UGCTTSProcessor, 
    UGCMotionProcessor,
    UGCLipSyncProcessor,
    UGCDistributionProcessor,
  ],
  controllers: [UGCFactoryController],
})
export class UGCFactoryModule {}
```

**2. Core UGC Workflow Service**
```typescript
// services/ugc-factory.service.ts
@Injectable()
export class UGCFactoryService {
  
  async createUGCBatch(input: CreateUGCBatchDto): Promise<UGCBatchResult> {
    // 1. Create execution context
    const batchId = `ugc_${Date.now()}`;
    
    // 2. Queue parallel jobs for each variation + format
    const jobs = [];
    for (let variation = 0; variation < input.variations; variation++) {
      for (const format of input.output_formats) {
        jobs.push(this.queueUGCGeneration(batchId, variation, format, input));
      }
    }
    
    // 3. Return batch tracking info
    return {
      batch_id: batchId,
      jobs_queued: jobs.length,
      estimated_completion: '4-6 minutes',
      total_cost: this.calculateEstimatedCost(input)
    };
  }
  
  private async queueUGCGeneration(
    batchId: string,
    variation: number, 
    format: string,
    input: CreateUGCBatchDto
  ) {
    return this.ugcQueue.add('generate-ugc-video', {
      batch_id: batchId,
      variation,
      format,
      script: input.script,
      avatar_image: input.avatar_image,
      voice_config: input.voice_config,
      motion_preset: input.motion_preset,
      delivery: input.delivery
    });
  }
}
```

**3. UGC Generation Processor**
```typescript
// processors/ugc-script-processor.ts
@Processor('ugc-factory')
export class UGCScriptProcessor {

  @Process('generate-ugc-video')
  async generateUGCVideo(job: Job<UGCGenerationJob>) {
    const { batch_id, variation, format, script, avatar_image, voice_config, motion_preset, delivery } = job.data;
    
    try {
      // Step 1: Generate TTS
      const audioResult = await this.generateTTS(script, voice_config, variation);
      
      // Step 2: Generate motion video  
      const motionResult = await this.generateMotionVideo(avatar_image, motion_preset, format);
      
      // Step 3: Lip sync combination
      const lipSyncResult = await this.generateLipSync(motionResult.video, audioResult.audio);
      
      // Step 4: Format optimization
      const optimizedVideo = await this.optimizeForFormat(lipSyncResult.video, format);
      
      // Step 5: Queue distribution
      await this.queueDistribution(batch_id, optimizedVideo, delivery, format);
      
      return {
        batch_id,
        variation,
        format,
        video_url: optimizedVideo.url,
        generation_time: job.processedOn ? Date.now() - job.processedOn : 0,
        cost: this.calculateJobCost(audioResult, motionResult, lipSyncResult)
      };
      
    } catch (error) {
      // Log error and try fallback models
      await this.handleGenerationError(job, error);
      throw error;
    }
  }
}
```

### Day 3-4: Motion Presets + Quality Fallbacks

**4. Motion Preset System**
```typescript
// Motion presets using existing Kling Motion Control
const MOTION_PRESETS = {
  casual_talking: {
    trajectory: [
      {x: 0.5, y: 0.5, frame: 0},
      {x: 0.52, y: 0.48, frame: 30},
      {x: 0.48, y: 0.52, frame: 60}, 
      {x: 0.5, y: 0.5, frame: 90}
    ],
    motion_strength: 0.3,
    duration: 5
  },
  enthusiastic: {
    trajectory: [
      {x: 0.5, y: 0.5, frame: 0},
      {x: 0.55, y: 0.45, frame: 20},
      {x: 0.45, y: 0.55, frame: 40},
      {x: 0.55, y: 0.45, frame: 60},
      {x: 0.5, y: 0.5, frame: 80}
    ],
    motion_strength: 0.6,
    duration: 5
  },
  professional: {
    trajectory: [
      {x: 0.5, y: 0.5, frame: 0},
      {x: 0.51, y: 0.49, frame: 40},
      {x: 0.49, y: 0.51, frame: 80},
      {x: 0.5, y: 0.5, frame: 120}
    ],
    motion_strength: 0.15,
    duration: 6
  }
};
```

**5. Lip Sync Fallback System**
```typescript
// Quality fallback chain using existing 5 models
const LIP_SYNC_FALLBACK_CHAIN = [
  'bytedance/omni-human',      // Best quality, image native
  'veed/fabric-1.0',           // Good quality, fast
  'pixverse/lipsync',          // Reliable backup  
  'sync/lipsync-2-pro',        // Premium sync labs
  'sync/lipsync-2'             // Basic sync labs
];

async generateLipSync(video: string, audio: string): Promise<LipSyncResult> {
  for (const model of LIP_SYNC_FALLBACK_CHAIN) {
    try {
      const result = await this.replicateService.generateLipSync(
        this.executionId, 
        this.nodeId,
        { video, audio, model }
      );
      
      if (result.status === 'succeeded') {
        return result;
      }
    } catch (error) {
      this.logger.warn(`Lip sync model ${model} failed, trying next: ${error.message}`);
      continue;
    }
  }
  
  throw new Error('All lip sync models failed');
}
```

### Day 5-7: Distribution System

**6. Multi-Platform Output Nodes**
```typescript
// nodes/distribution/base-output-node.ts
export abstract class BaseOutputNode {
  abstract platform: string;
  abstract enabled: boolean;
  
  abstract async deliver(
    video: GeneratedVideo,
    config: DeliveryConfig
  ): Promise<DeliveryResult>;
  
  protected async uploadVideo(video: GeneratedVideo): Promise<string> {
    // Common video upload logic
  }
  
  protected generateCaption(script: string, platform: string): string {
    // AI-generated platform-specific captions
  }
}

// nodes/distribution/telegram-output-node.ts  
export class TelegramOutputNode extends BaseOutputNode {
  platform = 'telegram';
  enabled = !!process.env.TELEGRAM_BOT_TOKEN;
  
  async deliver(video: GeneratedVideo, config: TelegramConfig): Promise<DeliveryResult> {
    // Use existing Telegram integration or build new
    const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
    
    const results = [];
    for (const target of config.targets) {
      try {
        const result = await bot.sendVideo(target, video.buffer, {
          caption: this.generateCaption(config.original_script, 'telegram'),
          width: video.width,
          height: video.height
        });
        
        results.push({
          target,
          success: true,
          message_id: result.message_id,
          url: `https://t.me/${target}/${result.message_id}`
        });
      } catch (error) {
        results.push({ target, success: false, error: error.message });
      }
    }
    
    return { platform: 'telegram', results };
  }
}
```

**7. Social Media Integration**
```typescript
// nodes/distribution/twitter-output-node.ts
export class TwitterOutputNode extends BaseOutputNode {
  platform = 'twitter';
  enabled = !!(process.env.TWITTER_API_KEY && process.env.TWITTER_ACCESS_TOKEN);
  
  async deliver(video: GeneratedVideo, config: TwitterConfig): Promise<DeliveryResult> {
    const client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_SECRET,
      accessToken: process.env.TWITTER_ACCESS_TOKEN,
      accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
    });
    
    try {
      // Upload video
      const mediaId = await client.v1.uploadMedia(video.buffer, {
        mimeType: 'video/mp4',
        target: 'tweet'
      });
      
      // Post tweet
      const tweet = await client.v2.tweet({
        text: config.caption || this.generateCaption(config.original_script, 'twitter'),
        media: { media_ids: [mediaId] }
      });
      
      return {
        platform: 'twitter',
        success: true,
        tweet_id: tweet.data.id,
        url: `https://twitter.com/i/status/${tweet.data.id}`
      };
    } catch (error) {
      return { platform: 'twitter', success: false, error: error.message };
    }
  }
}
```

## 🎯 Integration Points with Existing GenFeed

### Reuse Existing Services
- ✅ **TTSService** - Already has ElevenLabs with 40+ voices
- ✅ **ReplicateService** - Has all needed models (Veo, Kling, Lip Sync)
- ✅ **BullMQ** - Job queue system already configured
- ✅ **Cost Calculation** - Real cost tracking system exists
- ✅ **ExecutionsService** - Workflow execution tracking

### New Components Needed
- 🆕 **UGC Factory Module** - Orchestration layer
- 🆕 **Motion Preset System** - Predefined trajectory patterns  
- 🆕 **Distribution Nodes** - Social media output connectors
- 🆕 **Caption Generation** - AI platform-specific copy
- 🆕 **Format Optimization** - Platform-specific video processing

## 📊 Estimated Development Timeline

**Days 1-2**: Core workflow + TTS + Motion + Lip Sync integration
**Days 3-4**: Motion presets + fallback system + quality gates
**Days 5-6**: Distribution nodes (TG, Discord, GDrive first)  
**Days 7-8**: Social media nodes (Twitter, IG, TikTok)
**Day 9**: End-to-end testing + optimization

## 🎯 Ready to Start Implementation?

This leverages 80% of existing GenFeed infrastructure while adding the UGC-specific workflow orchestration and distribution system.

**Next step: Begin implementing the core UGC Factory module?** 🚀