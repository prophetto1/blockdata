import type { ReactNode } from 'react';
import { IconBrain, IconCloud, IconServer } from '@tabler/icons-react';

export type ProviderId = 'anthropic' | 'openai' | 'google' | 'custom';

export type ProviderDef = {
  id: ProviderId;
  label: string;
  description: string;
  icon: ReactNode;
  keyPlaceholder: string;
  keyHelpUrl?: string;
  models?: { value: string; label: string }[];
};

export const PROVIDERS: ProviderDef[] = [
  {
    id: 'anthropic',
    label: 'Anthropic',
    description: 'Claude models',
    icon: <IconBrain size={18} />,
    keyPlaceholder: 'sk-ant-api03-...',
    keyHelpUrl: 'https://console.anthropic.com/settings/keys',
    models: [
      { value: 'claude-opus-4-6', label: 'Claude Opus 4.6' },
      { value: 'claude-sonnet-4-5-20250929', label: 'Claude Sonnet 4.5 (default)' },
      { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
    ],
  },
  {
    id: 'openai',
    label: 'OpenAI',
    description: 'GPT models',
    icon: <IconCloud size={18} />,
    keyPlaceholder: 'sk-...',
    keyHelpUrl: 'https://platform.openai.com/api-keys',
    models: [
      { value: 'gpt-4.1', label: 'gpt-4.1' },
      { value: 'gpt-4.1-mini', label: 'gpt-4.1-mini (default)' },
      { value: 'gpt-4.1-nano', label: 'gpt-4.1-nano' },
      { value: 'o3', label: 'o3' },
      { value: 'o4-mini', label: 'o4-mini' },
    ],
  },
  {
    id: 'google',
    label: 'Google',
    description: 'Gemini / Vertex AI',
    icon: <IconCloud size={18} />,
    keyPlaceholder: 'AIza...',
    keyHelpUrl: 'https://aistudio.google.com/apikey',
    models: [
      { value: 'gemini-2.5-pro', label: 'gemini-2.5-pro' },
      { value: 'gemini-2.5-flash', label: 'gemini-2.5-flash (default)' },
      { value: 'gemini-2.0-flash', label: 'gemini-2.0-flash' },
    ],
  },
  {
    id: 'custom',
    label: 'Custom',
    description: 'OpenAI-compatible endpoint',
    icon: <IconServer size={18} />,
    keyPlaceholder: 'Your API key...',
  },
];

export function providerLabel(id: string): string {
  return PROVIDERS.find((p) => p.id === id)?.label ?? id;
}

