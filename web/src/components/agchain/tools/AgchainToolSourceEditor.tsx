import { Input } from '@/components/ui/input';
import type { AgchainToolSourceKind } from '@/lib/agchainTools';
import {
  SelectRoot,
  SelectControl,
  SelectTrigger,
  SelectValueText,
  SelectContent,
  SelectItem,
  SelectItemText,
  SelectItemIndicator,
  SelectHiddenSelect,
  createListCollection,
} from '@/components/ui/select';

const fieldClass = 'grid gap-1.5 text-sm text-foreground';

const implementationKindCollection = createListCollection({
  items: [
    { label: 'python_callable', value: 'python_callable' },
    { label: 'package_entrypoint', value: 'package_entrypoint' },
    { label: 'external_ref', value: 'external_ref' },
  ],
});

const transportTypeCollection = createListCollection({
  items: [
    { label: 'stdio', value: 'stdio' },
    { label: 'http', value: 'http' },
    { label: 'sse', value: 'sse' },
  ],
});

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
          <SelectRoot
            collection={implementationKindCollection}
            value={[draft.implementationKind]}
            onValueChange={(details) => {
              const val = details.value[0];
              if (val) onChange({ implementationKind: val });
            }}
          >
            <SelectControl>
              <SelectTrigger className="h-10">
                <SelectValueText />
              </SelectTrigger>
            </SelectControl>
            <SelectContent>
              {implementationKindCollection.items.map((item) => (
                <SelectItem key={item.value} item={item}>
                  <SelectItemText>{item.label}</SelectItemText>
                  <SelectItemIndicator>&#10003;</SelectItemIndicator>
                </SelectItem>
              ))}
            </SelectContent>
            <SelectHiddenSelect />
          </SelectRoot>
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
        <SelectRoot
          collection={transportTypeCollection}
          value={[draft.transportType]}
          onValueChange={(details) => {
            const val = details.value[0];
            if (val) onChange({ transportType: val });
          }}
        >
          <SelectControl>
            <SelectTrigger className="h-10">
              <SelectValueText />
            </SelectTrigger>
          </SelectControl>
          <SelectContent>
            {transportTypeCollection.items.map((item) => (
              <SelectItem key={item.value} item={item}>
                <SelectItemText>{item.label}</SelectItemText>
                <SelectItemIndicator>&#10003;</SelectItemIndicator>
              </SelectItem>
            ))}
          </SelectContent>
          <SelectHiddenSelect />
        </SelectRoot>
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
