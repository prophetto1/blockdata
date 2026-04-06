export function blockdataAiProvidersPath() {
  return '/app/blockdata-admin/ai-providers';
}

export function blockdataAiProviderPath(providerId: string) {
  return `${blockdataAiProvidersPath()}/${providerId}`;
}
