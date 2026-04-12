import test from 'node:test';
import assert from 'node:assert/strict';

const MODULE_PATH = new URL('../../tools/coordination/lib/session-classification.mjs', import.meta.url);

async function loadModule() {
  return import(`${MODULE_PATH.href}?t=${Date.now()}-${Math.random()}`);
}

test('registry exposes the exact canonical keys and display labels', async () => {
  const { loadSessionClassificationRegistry } = await loadModule();

  const registry = loadSessionClassificationRegistry();

  assert.equal(registry.registry_version, 1);
  assert.deepEqual(Object.keys(registry.session_types), [
    'vscode.cc.cli',
    'vscode.cdx.cli',
    'vscode.cc.ide-panel',
    'vscode.cdx.ide-panel',
    'claude-desktop.cc',
    'codex-app-win.cdx',
    'terminal.cc',
    'terminal.cdx',
    'unknown',
  ]);
  assert.equal(registry.session_types['vscode.cc.cli'].display_label, 'VS Code | CC CLI');
  assert.equal(registry.session_types['vscode.cdx.cli'].display_label, 'VS Code | CDX CLI');
  assert.equal(registry.session_types['vscode.cc.ide-panel'].display_label, 'VS Code | CC IDE');
  assert.equal(registry.session_types['vscode.cdx.ide-panel'].display_label, 'VS Code | CDX IDE');
  assert.equal(registry.session_types['claude-desktop.cc'].display_label, 'Claude Desktop | CC');
  assert.equal(registry.session_types['codex-app-win.cdx'].display_label, 'Codex App (Win) | CDX');
  assert.equal(registry.session_types['terminal.cc'].display_label, 'Terminal | CC');
  assert.equal(registry.session_types['terminal.cdx'].display_label, 'Terminal | CDX');
  assert.equal(registry.session_types.unknown.display_label, 'Unknown');
});

test('classifyLaunchSession resolves a known launch-stamped VS Code Claude Code CLI session', async () => {
  const { classifyLaunchSession } = await loadModule();

  const classification = classifyLaunchSession({
    containerHost: 'vscode',
    interactionSurface: 'cli',
    runtimeProduct: 'cc',
  });

  assert.equal(classification.key, 'vscode.cc.cli');
  assert.equal(classification.classified, true);
  assert.equal(classification.containerHost, 'vscode');
  assert.equal(classification.interactionSurface, 'cli');
  assert.equal(classification.runtimeProduct, 'cc');
  assert.equal(classification.registryVersion, 1);
  assert.equal(classification.reason, null);
  assert.deepEqual(classification.provenance, {
    key: 'launch_stamped',
    containerHost: 'launch_stamped',
    interactionSurface: 'launch_stamped',
    runtimeProduct: 'launch_stamped',
  });
});

test('classifyLaunchSession preserves partial-known records as unknown without failing', async () => {
  const { classifyLaunchSession } = await loadModule();

  const classification = classifyLaunchSession({
    containerHost: 'vscode',
  });

  assert.equal(classification.key, 'unknown');
  assert.equal(classification.classified, false);
  assert.equal(classification.containerHost, 'vscode');
  assert.equal(classification.interactionSurface, 'unknown');
  assert.equal(classification.runtimeProduct, 'unknown');
  assert.equal(classification.reason, 'insufficient_signal');
  assert.deepEqual(classification.provenance, {
    key: 'unknown',
    containerHost: 'launch_stamped',
    interactionSurface: 'unknown',
    runtimeProduct: 'unknown',
  });
});

test('classifyLaunchSession uses ide-panel as the canonical surface term', async () => {
  const { classifyLaunchSession } = await loadModule();

  const classification = classifyLaunchSession({
    containerHost: 'vscode',
    interactionSurface: 'ide',
    runtimeProduct: 'cdx',
  });

  assert.equal(classification.key, 'unknown');
  assert.equal(classification.classified, false);
  assert.equal(classification.interactionSurface, 'unknown');
  assert.equal(classification.reason, 'insufficient_signal');
});

test('deriveDisplayLabel returns the official registry label for known and unknown keys', async () => {
  const { classifyLaunchSession, deriveDisplayLabel } = await loadModule();

  const known = classifyLaunchSession({
    containerHost: 'vscode',
    interactionSurface: 'ide-panel',
    runtimeProduct: 'cdx',
  });
  const partial = classifyLaunchSession({
    containerHost: 'vscode',
  });

  assert.equal(deriveDisplayLabel(known), 'VS Code | CDX IDE');
  assert.equal(deriveDisplayLabel(partial), 'Unknown');
});
