import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExecutionsService } from '@/services/executions.service';

export interface TTSInput {
  text: string;
  voice: string;
  provider: 'elevenlabs' | 'openai';
  stability?: number;
  similarityBoost?: number;
  speed?: number;
}

export interface TTSResult {
  audioUrl: string;
  duration?: number;
}

// ElevenLabs voice IDs mapping
const ELEVENLABS_VOICE_IDS: Record<string, string> = {
  adam: 'pNInz6obpgDQGcFmaJgB',
  antoni: 'ErXwobaYiN019PkySvjV',
  arnold: 'VR6AewLTigWG4xSOukaG',
  callum: 'N2lVS1w4EtoT3dr4eOWO',
  charlie: 'IKne3meq5aSn9XLyUdCD',
  charlotte: 'XB0fDUnXU5powFXDhCwa',
  clyde: '2EiwWnXFnvU5JabPnv8n',
  daniel: 'onwK4e9ZLuTAKqWW03F9',
  dave: 'CYw3kZ02Hs0563khs1Fj',
  domi: 'AZnzlk1XvdvUeBnXmlld',
  dorothy: 'ThT5KcBeYPX3keUQqHPh',
  drew: '29vD33N1CtxCmqQRPOHJ',
  elli: 'MF3mGyEYCl7XYWbV9V6O',
  emily: 'LcfcDJNUP1GQjkzn1xUU',
  ethan: 'g5CIjZEefAph4nQFvHAz',
  fin: 'D38z5RcWu1voky8WS1ja',
  freya: 'jsCqWAovK2LkecY7zXl4',
  george: 'JBFqnCBsd6RMkjVDRZzb',
  gigi: 'jBpfuIE2acCO8z3wKNLl',
  giovanni: 'zcAOhNBS3c14rBihAFp1',
  glinda: 'z9fAnlkpzviPz146aGWa',
  grace: 'oWAxZDx7w5VEj9dCyTzz',
  harry: 'SOYHLrjzK2X1ezoPC6cr',
  james: 'ZQe5CZNOzWyzPSCn5a3c',
  jeremy: 'bVMeCyTHy58xNoL34h3p',
  jessie: 't0jbNlBVZ17f02VDIeMI',
  joseph: 'Zlb1dXrM653N07WRdFW3',
  josh: 'TxGEqnHWrfWFTfGW9XjX',
  liam: 'TX3LPaxmHKxFdv7VOQHJ',
  lily: 'pFZP5JQG7iQjIQuC4Bku',
  matilda: 'XrExE9yKIg1WjnnlVkGX',
  matthew: 'Yko7PKs6JEPSqpOtyK2s',
  michael: 'flq6f7yk4E4fJM5XTYuZ',
  mimi: 'zrHiDhphv9ZnVXBqCLjz',
  nicole: 'piTKgcLEGmPE4e6mEKli',
  patrick: 'ODq5zmih8GrVes37Dizd',
  paul: '5Q0t7uMcjvnagumLfvZi',
  rachel: '21m00Tcm4TlvDq8ikWAM',
  ryan: 'wViXBPUzp2ZZixB1xQuM',
  sam: 'yoZ06aMxZJJ28mfd3POQ',
  sarah: 'EXAVITQu4vr4xnSDxMaL',
  serena: 'pMsXgVXv3BLzUgSXRplE',
  thomas: 'GBv7mTt0atIp3Br8iCZE',
};

@Injectable()
export class TTSService {
  private readonly logger = new Logger(TTSService.name);
  private readonly elevenLabsApiKey: string | undefined;

  constructor(
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => ExecutionsService))
    private readonly executionsService: ExecutionsService
  ) {
    this.elevenLabsApiKey = this.configService.get<string>('ELEVENLABS_API_KEY');
  }

  /**
   * Generate speech from text using ElevenLabs
   */
  async generateSpeech(executionId: string, nodeId: string, input: TTSInput): Promise<TTSResult> {
    if (!this.elevenLabsApiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    const voiceId = ELEVENLABS_VOICE_IDS[input.voice] ?? ELEVENLABS_VOICE_IDS.rachel;

    this.logger.log(`Generating speech for node ${nodeId} with voice ${input.voice}`);

    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        body: JSON.stringify({
          model_id: 'eleven_multilingual_v2',
          text: input.text,
          voice_settings: {
            similarity_boost: input.similarityBoost ?? 0.75,
            stability: input.stability ?? 0.5,
            style: 0,
            use_speaker_boost: true,
          },
        }),
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': this.elevenLabsApiKey,
        },
        method: 'POST',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
      }

      // Get the audio as a buffer
      const audioBuffer = await response.arrayBuffer();
      const audioBase64 = Buffer.from(audioBuffer).toString('base64');
      const audioDataUrl = `data:audio/mpeg;base64,${audioBase64}`;

      // Update execution with result
      await this.executionsService.updateNodeResult(executionId, nodeId, 'complete', {
        audio: audioDataUrl,
      });

      this.logger.log(`Speech generated successfully for node ${nodeId}`);

      return {
        audioUrl: audioDataUrl,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to generate speech for node ${nodeId}: ${errorMessage}`);

      await this.executionsService.updateNodeResult(
        executionId,
        nodeId,
        'error',
        undefined,
        errorMessage
      );

      throw error;
    }
  }
}
