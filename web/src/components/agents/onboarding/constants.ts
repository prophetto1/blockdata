export type OnboardingAuthMethod = 'api_key' | 'vertex' | 'custom';

export const DEFAULT_KEYWORDS: Record<string, string> = {
  anthropic: '/claude',
  openai: '/gpt',
  google: '/gemini',
  custom: '/local',
};

export function supportedAuthMethods(providerFamily: string): OnboardingAuthMethod[] {
  if (providerFamily === 'google') return ['api_key', 'vertex'];
  if (providerFamily === 'custom') return ['custom'];
  return ['api_key'];
}

export function defaultAuthMethod(providerFamily: string): OnboardingAuthMethod {
  if (providerFamily === 'google') return 'api_key';
  if (providerFamily === 'custom') return 'custom';
  return 'api_key';
}
