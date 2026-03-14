import { Clipboard } from '@ark-ui/react/clipboard';
import { JsonTreeView } from '@ark-ui/react/json-tree-view';
import { IconCheck, IconChevronRight, IconCopy } from '@tabler/icons-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/cn';

export type ParsedJsonViewerContent =
  | { mode: 'tree'; data: unknown }
  | { mode: 'raw'; data: string };

export function parseJsonViewerContent(content: string): ParsedJsonViewerContent {
  try {
    return {
      mode: 'tree',
      data: JSON.parse(content) as unknown,
    };
  } catch {
    return {
      mode: 'raw',
      data: content,
    };
  }
}

const jsonViewerRootClass = [
  'w-full text-foreground',
  'font-[family-name:var(--parse-json-font-family)]',
  '[&_[data-part=branch-content]]:relative',
  '[&_[data-part=branch-indent-guide]]:absolute',
  '[&_[data-part=branch-indent-guide]]:h-full',
  '[&_[data-part=branch-indent-guide]]:w-px',
  '[&_[data-part=branch-indent-guide]]:bg-[var(--parse-json-indent-guide)]',
  '[&_[data-part=branch-control]]:flex',
  '[&_[data-part=branch-control]]:select-none',
  '[&_[data-part=branch-control]]:rounded',
  '[&_[data-part=branch-control]]:px-1',
  '[&_[data-part=branch-control]]:hover:bg-[var(--parse-json-hover-bg)]',
  '[&_[data-part=item]]:flex',
  '[&_[data-part=item]]:relative',
  '[&_[data-part=item]]:rounded',
  '[&_[data-part=item]]:px-1',
  '[&_[data-part=item]]:hover:bg-[var(--parse-json-hover-bg)]',
  '[&_[data-part=item-text]]:flex',
  '[&_[data-part=item-text]]:items-baseline',
  '[&_[data-part=branch-text]]:flex',
  '[&_[data-part=branch-text]]:items-baseline',
].join(' ');

const jsonViewerTreeClass = [
  'flex flex-col',
  'font-[family-name:var(--parse-json-font-family)]',
  'text-[length:var(--parse-json-font-size)]',
  'leading-[var(--parse-json-line-height)]',
  '[&_svg]:h-3.5 [&_svg]:w-3.5',
  '[&_[data-part=branch-indicator]]:mr-1',
  '[&_[data-part=branch-indicator]]:inline-flex',
  '[&_[data-part=branch-indicator]]:items-center',
  '[&_[data-part=branch-indicator]]:origin-center',
  '[&_[data-part=branch-indicator][data-state=open]]:rotate-90',
  '[&_[data-type=string]]:text-[var(--parse-json-string)]',
  '[&_[data-type=number]]:text-[var(--parse-json-number)]',
  '[&_[data-type=boolean]]:font-semibold [&_[data-type=boolean]]:text-[var(--parse-json-boolean)]',
  '[&_[data-type=null]]:italic [&_[data-type=null]]:text-[var(--parse-json-null)]',
  '[&_[data-kind=brace]]:font-bold [&_[data-kind=brace]]:text-[var(--parse-json-brace)]',
  '[&_[data-kind=key]]:font-medium [&_[data-kind=key]]:text-[var(--parse-json-key)]',
  '[&_[data-kind=colon]]:mx-0.5 [&_[data-kind=colon]]:text-[var(--parse-json-colon)]',
  '[&_[data-kind=preview-text]]:italic [&_[data-kind=preview-text]]:text-[var(--parse-json-preview-text)]',
].join(' ');

type JsonViewerProps = {
  value: unknown;
  mode?: 'tree' | 'raw';
  defaultExpandedDepth?: number;
  className?: string;
};

export function JsonViewer({
  value,
  mode = 'tree',
  defaultExpandedDepth = 1,
  className,
}: JsonViewerProps) {
  const textValue = typeof value === 'string' ? value : JSON.stringify(value, null, 2);

  return (
    <div className={cn('relative h-full min-h-0', className)}>
      <ScrollArea
        className="h-full min-h-0 rounded-md border border-[var(--parse-json-border)] bg-[var(--parse-json-bg)]"
        viewportClass="h-full overflow-auto p-4 pr-10"
      >
        {mode === 'raw' ? (
          <pre
            data-testid="json-viewer-raw"
            className={[
              'm-0 whitespace-pre text-foreground',
              'font-[family-name:var(--parse-json-font-family)]',
              'text-[length:var(--parse-json-font-size)]',
              'leading-[var(--parse-json-line-height)]',
            ].join(' ')}
          >
            {textValue}
          </pre>
        ) : (
          <JsonTreeView.Root
            defaultExpandedDepth={defaultExpandedDepth}
            className={jsonViewerRootClass}
            data={value}
          >
            <JsonTreeView.Tree
              data-testid="json-viewer-tree"
              className={jsonViewerTreeClass}
              arrow={<IconChevronRight size={12} />}
            />
          </JsonTreeView.Root>
        )}
      </ScrollArea>

      <Clipboard.Root value={textValue}>
        <Clipboard.Trigger
          className="absolute right-2 top-2 inline-flex items-center gap-1 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
          title="Copy JSON"
        >
          <Clipboard.Indicator copied={<IconCheck size={12} className="text-primary" />}>
            <IconCopy size={12} />
          </Clipboard.Indicator>
        </Clipboard.Trigger>
      </Clipboard.Root>
    </div>
  );
}
