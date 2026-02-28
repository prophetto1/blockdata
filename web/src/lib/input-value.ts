type UnknownRecord = Record<string, unknown>;

function readValueProperty(input: unknown): unknown {
  if (!input || typeof input !== 'object') return undefined;
  return (input as UnknownRecord).value;
}

export function coerceTextInputValue(input: unknown): string {
  if (typeof input === 'string') return input;
  if (typeof input === 'number' || typeof input === 'boolean') return String(input);

  const currentTargetValue = readValueProperty((input as UnknownRecord | undefined)?.currentTarget);
  if (currentTargetValue !== undefined && currentTargetValue !== null) {
    return String(currentTargetValue);
  }

  const targetValue = readValueProperty((input as UnknownRecord | undefined)?.target);
  if (targetValue !== undefined && targetValue !== null) {
    return String(targetValue);
  }

  const directValue = readValueProperty(input);
  if (directValue !== undefined && directValue !== null) {
    return String(directValue);
  }

  return '';
}
