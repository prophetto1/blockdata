export function blockdataAiProvidersPath() {
  return '/app/superuser/bd/ai-providers';
}

export function blockdataAiProviderPath(providerId: string) {
  return `${blockdataAiProvidersPath()}/${providerId}`;
}
