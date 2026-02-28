import { useSyncExternalStore } from 'react';
import MonacoEditor from '@monaco-editor/react';
import { PageHeader } from '@/components/common/PageHeader';

const DEFAULT_EDITOR_CONTENT = `pipeline:
  name: invoice_ingestion
  source: uploads/invoices
  destination: warehouse.invoices
  transforms:
    - normalize_currency
    - parse_due_date
`;

function subscribeTheme(onStoreChange: () => void): () => void {
  if (typeof document === 'undefined') return () => {};
  const observer = new MutationObserver(() => onStoreChange());
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => observer.disconnect();
}

function getMonacoTheme(): string {
  if (typeof document === 'undefined') return 'vs-dark';
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'vs-dark';
}

function useMonacoTheme(): string {
  return useSyncExternalStore(subscribeTheme, getMonacoTheme, () => 'vs-dark');
}

export default function Editor() {
  const monacoTheme = useMonacoTheme();

  return (
    <>
      <PageHeader title="Editor" />
      <div className="overflow-hidden rounded-md border">
        <div className="h-[calc(100dvh-220px)] min-h-[420px]">
          <MonacoEditor
            language="yaml"
            theme={monacoTheme}
            defaultValue={DEFAULT_EDITOR_CONTENT}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              lineHeight: 1.6,
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              automaticLayout: true,
            }}
          />
        </div>
      </div>
    </>
  );
}
