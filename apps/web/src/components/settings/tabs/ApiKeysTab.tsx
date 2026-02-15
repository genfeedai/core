'use client';

import { InfoBox } from '@/components/ui/settings-section';
import { Code } from 'lucide-react';

const TTS_ENABLED = process.env.NEXT_PUBLIC_TTS_ENABLED === 'true';

interface ApiKeyStatus {
  name: string;
  envVar: string;
  location: 'api' | 'web' | 'both';
  isConfigured: boolean | null;
  description: string;
  docsUrl?: string;
}

const API_KEYS: ApiKeyStatus[] = [
  {
    description: 'Required for image/video generation (Nano Banana, Veo, Kling)',
    docsUrl: 'https://replicate.com/account/api-tokens',
    envVar: 'REPLICATE_API_TOKEN',
    isConfigured: null,
    location: 'api',
    name: 'Replicate',
  },
  {
    description: 'Required for Text-to-Speech (Facecam Avatar template)',
    docsUrl: 'https://elevenlabs.io/app/settings/api-keys',
    envVar: 'ELEVENLABS_API_KEY',
    isConfigured: TTS_ENABLED,
    location: 'both',
    name: 'ElevenLabs',
  },
  {
    description: 'Alternative provider for image/video generation',
    docsUrl: 'https://fal.ai/dashboard/keys',
    envVar: 'FAL_API_KEY',
    isConfigured: null,
    location: 'api',
    name: 'fal.ai',
  },
  {
    description: 'Alternative provider for AI models',
    docsUrl: 'https://huggingface.co/settings/tokens',
    envVar: 'HF_API_TOKEN',
    isConfigured: null,
    location: 'api',
    name: 'Hugging Face',
  },
];

function StatusDot({ status }: { status: boolean | null }) {
  const color = status === true ? 'bg-green-500' : status === false ? 'bg-red-500' : 'bg-gray-400';
  const label =
    status === true ? 'Configured' : status === false ? 'Not configured' : 'Status unknown';

  return <div className={`h-2.5 w-2.5 rounded-full ${color}`} title={label} />;
}

export function ApiKeysTab() {
  return (
    <div className="space-y-6">
      <InfoBox variant="warning" title="API keys must be configured in .env files">
        This app does not store API keys in the browser. You need to edit the environment files
        directly on the server.
      </InfoBox>

      {/* File Locations */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-foreground">Configuration Files</h4>
        <div className="grid gap-2">
          <InfoBox>
            <code className="text-xs font-medium text-primary">apps/api/.env</code>
            <p className="mt-1 text-xs text-muted-foreground">
              Backend API keys (Replicate, ElevenLabs, fal.ai, etc.)
            </p>
          </InfoBox>
          <InfoBox>
            <code className="text-xs font-medium text-primary">apps/web/.env</code>
            <p className="mt-1 text-xs text-muted-foreground">
              Frontend flags (e.g., NEXT_PUBLIC_TTS_ENABLED=true)
            </p>
          </InfoBox>
        </div>
      </div>

      {/* API Keys Status */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-foreground">Required API Keys</h4>
        <div className="space-y-2">
          {API_KEYS.map((key) => (
            <div
              key={key.envVar}
              className="flex items-start gap-3 rounded-lg border border-border p-3"
            >
              <div className="mt-0.5">
                <StatusDot status={key.isConfigured} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-foreground">{key.name}</span>
                  <code className="text-[10px] bg-secondary px-1.5 py-0.5 rounded text-muted-foreground">
                    {key.envVar}
                  </code>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{key.description}</p>
                {key.isConfigured === false && (
                  <p className="text-xs text-red-500 mt-1">
                    Add to apps/{key.location === 'both' ? 'api/.env & web/.env' : 'api/.env'}
                  </p>
                )}
              </div>
              {key.docsUrl && (
                <a
                  href={key.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline whitespace-nowrap"
                >
                  Get key
                </a>
              )}
            </div>
          ))}
        </div>
      </div>

      <InfoBox title="ElevenLabs Setup" icon={Code}>
        <p className="text-xs text-muted-foreground">To enable Text-to-Speech, add both:</p>
        <pre className="mt-2 overflow-x-auto rounded bg-background p-3 text-xs text-muted-foreground">
          {`# apps/api/.env
ELEVENLABS_API_KEY=your_key_here

# apps/web/.env
NEXT_PUBLIC_TTS_ENABLED=true`}
        </pre>
        <p className="mt-2 text-xs text-muted-foreground">
          Then restart both the API and web servers.
        </p>
      </InfoBox>
    </div>
  );
}
