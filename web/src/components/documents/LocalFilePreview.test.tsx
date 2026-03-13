import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LocalFilePreview } from './LocalFilePreview';
import { readFileContent } from '@/lib/fs-access';

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/lib/fs-access', async () => {
  const actual = await vi.importActual<typeof import('@/lib/fs-access')>('@/lib/fs-access');
  return {
    ...actual,
    readFileContent: vi.fn(),
  };
});

const readFileContentMock = vi.mocked(readFileContent);

describe('LocalFilePreview', () => {
  it('renders markdown files as formatted markdown instead of raw text', async () => {
    readFileContentMock.mockResolvedValueOnce('# Your Name\n\n## Experience\n\n- Built the preview\n');

    render(
      <LocalFilePreview
        node={{
          id: 'file:resume.md',
          name: 'resume.md',
          path: 'resume.md',
          extension: '.md',
          kind: 'file',
          handle: {} as FileSystemFileHandle,
        }}
      />,
    );

    expect(await screen.findByRole('heading', { level: 1, name: 'Your Name' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Experience' })).toBeInTheDocument();
    expect(screen.getByText('Built the preview')).toBeInTheDocument();
  });
});
