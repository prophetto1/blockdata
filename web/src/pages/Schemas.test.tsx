import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import Schemas, {
  SCHEMA_DEFAULT_PANES,
  SCHEMA_START_ACTIONS,
  SCHEMA_START_DESCRIPTION,
  SCHEMA_START_TITLE,
  SCHEMA_TABS,
} from './Schemas';

vi.mock('@/components/common/useShellHeaderTitle', () => ({
  useShellHeaderTitle: vi.fn(),
}));

vi.mock('@monaco-editor/react', () => ({
  default: ({ defaultValue }: { defaultValue?: string }) => (
    <div data-testid="monaco-editor">{defaultValue}</div>
  ),
}));

describe('schema page layout', () => {
  it('uses a three-column shell with files and user schemas on the left', () => {
    expect(SCHEMA_TABS.map((tab) => tab.label)).toEqual([
      'File List',
      'User Schemas',
      'Schema',
      'Preview',
    ]);

    expect(SCHEMA_DEFAULT_PANES).toEqual([
      expect.objectContaining({
        tabs: ['schema-files', 'schema-library'],
        activeTab: 'schema-files',
      }),
      expect.objectContaining({
        tabs: ['schema-editor'],
        activeTab: 'schema-editor',
      }),
      expect.objectContaining({
        tabs: ['schema-preview'],
        activeTab: 'schema-preview',
      }),
    ]);
  });

  it('starts in the create-schema state without the editor toolbar', () => {
    render(<Schemas />);

    expect(screen.getByText(SCHEMA_START_TITLE)).toBeInTheDocument();
    expect(screen.getByText(SCHEMA_START_DESCRIPTION)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: SCHEMA_START_ACTIONS[0] })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: SCHEMA_START_ACTIONS[1] })).toBeInTheDocument();
    expect(screen.queryByRole('toolbar', { name: 'Schema view options' })).not.toBeInTheDocument();
  });

  it('shows the schema editor toolbar after creating a schema', () => {
    render(<Schemas />);

    fireEvent.click(screen.getByRole('button', { name: 'Create Manually' }));

    expect(screen.getByRole('toolbar', { name: 'Schema view options' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });
});
