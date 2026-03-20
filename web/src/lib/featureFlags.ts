const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);

function readFlag(rawValue: string | undefined, fallback: boolean): boolean {
  if (rawValue == null || rawValue.trim() === '') return fallback;
  return TRUE_VALUES.has(rawValue.trim().toLowerCase());
}

function readNumber(rawValue: string | undefined, fallback: number): number {
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const featureFlags = {
  shellV2: readFlag(import.meta.env.VITE_FF_SHELL_V2, true),
  assistantDock: readFlag(import.meta.env.VITE_FF_ASSISTANT_DOCK, true),
  agentsConfigUI: readFlag(import.meta.env.VITE_FF_AGENTS_CONFIG_UI, false),
  mcpPlaceholderUI: readFlag(import.meta.env.VITE_FF_MCP_PLACEHOLDER_UI, false),
  providerConnectionFlows: readFlag(import.meta.env.VITE_FF_PROVIDER_CONNECTION_FLOWS, false),
  commandsUI: readFlag(import.meta.env.VITE_FF_COMMANDS_UI, false),
  observabilityShellV2: readFlag(import.meta.env.VITE_FF_OBSERVABILITY_SHELL_V2, false),
  observabilitySignalRUrl: import.meta.env.VITE_OBSERVABILITY_SIGNALR_URL || '',
  observabilityPollMs: readNumber(import.meta.env.VITE_OBSERVABILITY_POLL_MS, 5000),
};
