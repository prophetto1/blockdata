import { Input } from '@/components/ui/input';
import type { AgchainToolSourceKind } from '@/lib/agchainTools';

const fieldClass = 'grid gap-1.5 text-sm text-foreground';
const selectClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1';

export type AgchainToolEditorState = {
  sourceKind: Exclude<AgchainToolSourceKind, 'builtin'>;
  toolName: string;
  displayName: string;
  description: string;
  approvalMode: string;
  versionLabel: string;
  parallelCallsAllowed: boolean;
  implementationKind: string;
  implementationRef: string;
  bridgeName: string;
  transportType: string;
  command: string;
  url: string;
};

type AgchainToolSourceEditorProps = {
  draft: AgchainToolEditorState;
  onChange: (updates: Partial<AgchainToolEditorState>) => void;
};

export function AgchainToolSourceEditor({ draft, onChange }: AgchainToolSourceEditorProps) {
  if (draft.sourceKind === 'custom') {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <div className={fieldClass}>
          <label htmlFor="agchain-tool-implementation-kind">Implementation kind</label>
          <select
            id="agchain-tool-implementation-kind"
            className={selectClass}
            value={draft.implementationKind}
            onChange={(event) => onChange({ implementationKind: event.currentTarget.value })}
          >
            <option value="python_callable">python_callable</option>
            <option value="package_entrypoint">package_entrypoint</option>
            <option value="external_ref">external_ref</option>
          </select>
        </div>
        <div className={fieldClass}>
          <label htmlFor="agchain-tool-implementation-ref">Implementation ref</label>
          <Input
            id="agchain-tool-implementation-ref"
            value={draft.implementationRef}
            onChange={(event) => onChange({ implementationRef: event.currentTarget.value })}
          />
        </div>
      </div>
    );
  }

  if (draft.sourceKind === 'bridged') {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <div className={fieldClass}>
          <label htmlFor="agchain-tool-bridge-name">Bridge name</label>
          <Input
            id="agchain-tool-bridge-name"
            value={draft.bridgeName}
            onChange={(event) => onChange({ bridgeName: event.currentTarget.value })}
          />
        </div>
        <div className={fieldClass}>
          <label htmlFor="agchain-tool-bridge-ref">Implementation ref</label>
          <Input
            id="agchain-tool-bridge-ref"
            value={draft.implementationRef}
            onChange={(event) => onChange({ implementationRef: event.currentTarget.value })}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className={fieldClass}>
        <label htmlFor="agchain-tool-transport-type">Transport type</label>
        <select
          id="agchain-tool-transport-type"
          className={selectClass}
          value={draft.transportType}
          onChange={(event) => onChange({ transportType: event.currentTarget.value })}
        >
          <option value="stdio">stdio</option>
          <option value="http">http</option>
          <option value="sse">sse</option>
        </select>
      </div>

      {draft.transportType === 'stdio' ? (
        <div className={fieldClass}>
          <label htmlFor="agchain-tool-command">Command</label>
          <Input
            id="agchain-tool-command"
            value={draft.command}
            onChange={(event) => onChange({ command: event.currentTarget.value })}
          />
        </div>
      ) : (
        <div className={fieldClass}>
          <label htmlFor="agchain-tool-url">URL</label>
          <Input
            id="agchain-tool-url"
            value={draft.url}
            onChange={(event) => onChange({ url: event.currentTarget.value })}
          />
        </div>
      )}
    </div>
  );
}
