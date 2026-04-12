import { readFileSync } from 'node:fs';

const REGISTRY_PATH = new URL('../session-classification-registry.v1.json', import.meta.url);

const CONTAINER_HOSTS = new Set([
  'vscode',
  'claude-desktop',
  'codex-app-win',
  'terminal',
  'unknown',
]);

const INTERACTION_SURFACES = new Set([
  'cli',
  'ide-panel',
  'desktop-app',
  'unknown',
]);

const RUNTIME_PRODUCTS = new Set([
  'cc',
  'cdx',
  'unknown',
]);

let cachedRegistry = null;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeEnum(value, allowedValues) {
  if (typeof value !== 'string') {
    return 'unknown';
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized || !allowedValues.has(normalized)) {
    return 'unknown';
  }

  return normalized;
}

function isKnown(value) {
  return value !== 'unknown';
}

export function loadSessionClassificationRegistry({ forceReload = false } = {}) {
  if (!forceReload && cachedRegistry) {
    return clone(cachedRegistry);
  }

  const parsed = JSON.parse(readFileSync(REGISTRY_PATH, 'utf8'));
  cachedRegistry = parsed;
  return clone(parsed);
}

export function findSessionTypeKey({
  containerHost = 'unknown',
  interactionSurface = 'unknown',
  runtimeProduct = 'unknown',
} = {}, { registry = loadSessionClassificationRegistry() } = {}) {
  for (const [key, entry] of Object.entries(registry.session_types)) {
    if (key === 'unknown') {
      continue;
    }
    if (
      entry.container_host === containerHost
      && entry.interaction_surface === interactionSurface
      && entry.runtime_product === runtimeProduct
    ) {
      return key;
    }
  }

  return 'unknown';
}

export function classifyLaunchSession({
  containerHost,
  interactionSurface,
  runtimeProduct,
  sourceProvenance = 'launch_stamped',
} = {}, { registry = loadSessionClassificationRegistry() } = {}) {
  const normalizedContainerHost = normalizeEnum(containerHost, CONTAINER_HOSTS);
  const normalizedInteractionSurface = normalizeEnum(interactionSurface, INTERACTION_SURFACES);
  const normalizedRuntimeProduct = normalizeEnum(runtimeProduct, RUNTIME_PRODUCTS);

  const key = findSessionTypeKey(
    {
      containerHost: normalizedContainerHost,
      interactionSurface: normalizedInteractionSurface,
      runtimeProduct: normalizedRuntimeProduct,
    },
    { registry },
  );

  const classified = key !== 'unknown';
  const reason = classified ? null : 'insufficient_signal';

  return {
    key,
    containerHost: normalizedContainerHost,
    interactionSurface: normalizedInteractionSurface,
    runtimeProduct: normalizedRuntimeProduct,
    classified,
    registryVersion: registry.registry_version,
    reason,
    provenance: {
      key: classified ? sourceProvenance : 'unknown',
      containerHost: isKnown(normalizedContainerHost) ? sourceProvenance : 'unknown',
      interactionSurface: isKnown(normalizedInteractionSurface) ? sourceProvenance : 'unknown',
      runtimeProduct: isKnown(normalizedRuntimeProduct) ? sourceProvenance : 'unknown',
    },
  };
}

export function deriveDisplayLabel(classification, { registry = loadSessionClassificationRegistry() } = {}) {
  const key = classification?.key;
  const entry = registry.session_types[key] ?? registry.session_types.unknown;
  return entry.display_label;
}
