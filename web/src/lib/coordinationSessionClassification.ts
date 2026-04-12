import type { CoordinationSessionClassification, CoordinationSessionTypeKey } from '@/lib/coordinationApi';

export const COORDINATION_SESSION_CLASSIFICATION_LABELS: Record<CoordinationSessionTypeKey, string> = {
  'vscode.cc.cli': 'VS Code | CC CLI',
  'vscode.cdx.cli': 'VS Code | CDX CLI',
  'vscode.cc.ide-panel': 'VS Code | CC IDE Panel',
  'vscode.cdx.ide-panel': 'VS Code | CDX IDE Panel',
  'claude-desktop.cc': 'Claude Desktop | CC',
  'codex-app-win.cdx': 'Codex App Win | CDX',
  'terminal.cc': 'Terminal | CC',
  'terminal.cdx': 'Terminal | CDX',
  unknown: 'Unknown',
};

export const COORDINATION_SESSION_CLASSIFICATION_TYPE_ORDER: CoordinationSessionTypeKey[] = [
  'vscode.cc.cli',
  'vscode.cdx.cli',
  'vscode.cc.ide-panel',
  'vscode.cdx.ide-panel',
  'claude-desktop.cc',
  'codex-app-win.cdx',
  'terminal.cc',
  'terminal.cdx',
  'unknown',
];

export function getCoordinationSessionClassificationLabel(
  classification: CoordinationSessionClassification | (Partial<CoordinationSessionClassification> & { key?: string }) | null | undefined,
): string {
  const displayLabel =
    typeof classification?.display_label === 'string' ? classification.display_label.trim() : '';

  if (displayLabel.length > 0) {
    return displayLabel;
  }

  const key = classification?.key;
  if (typeof key === 'string' && key in COORDINATION_SESSION_CLASSIFICATION_LABELS) {
    return COORDINATION_SESSION_CLASSIFICATION_LABELS[key as CoordinationSessionTypeKey];
  }

  return COORDINATION_SESSION_CLASSIFICATION_LABELS.unknown;
}
