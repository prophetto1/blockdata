const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);

function readFlag(rawValue: string | undefined, fallback: boolean): boolean {
  if (rawValue == null || rawValue.trim() === '') return fallback;
  return TRUE_VALUES.has(rawValue.trim().toLowerCase());
}

export const featureFlags = {
  shellV2: readFlag(import.meta.env.VITE_FF_SHELL_V2, true),
  assistantDock: readFlag(import.meta.env.VITE_FF_ASSISTANT_DOCK, true),
};
