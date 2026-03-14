import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { JsonViewer, parseJsonViewerContent } from './JsonViewer';

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('parseJsonViewerContent', () => {
  it('parses valid json into structured data', () => {
    const result = parseJsonViewerContent('{"schema_name":"DoclingDocument","count":2}');

    expect(result.mode).toBe('tree');
    expect(result.data).toEqual({
      schema_name: 'DoclingDocument',
      count: 2,
    });
  });

  it('falls back to raw text when content is not valid json', () => {
    const result = parseJsonViewerContent('{not-json');

    expect(result.mode).toBe('raw');
    expect(result.data).toBe('{not-json');
  });
});

describe('JsonViewer', () => {
  it('renders an Ark JsonTreeView for structured data with parse-specific typography tokens', () => {
    render(
      <JsonViewer
        value={{
          schema_name: 'DoclingDocument',
          texts: [{ text: 'Hello world' }],
        }}
      />,
    );

    const tree = screen.getByTestId('json-viewer-tree');
    expect(tree).toHaveTextContent('schema_name');
    expect(tree.className).toContain('text-[length:var(--parse-json-font-size)]');
    expect(tree.className).toContain('leading-[var(--parse-json-line-height)]');
    expect(tree.className).toContain('[&_[data-kind=key]]:text-[var(--parse-json-key)]');
    expect(tree.className).toContain('[&_[data-type=string]]:text-[var(--parse-json-string)]');
  });

  it('renders a raw fallback view when given invalid text content', () => {
    render(<JsonViewer value="{not-json" mode="raw" />);

    const raw = screen.getByTestId('json-viewer-raw');
    expect(raw).toHaveTextContent('{not-json');
    expect(raw.className).toContain('font-[family-name:var(--parse-json-font-family)]');
    expect(raw.className).toContain('text-[length:var(--parse-json-font-size)]');
  });
});
