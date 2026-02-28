import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import Editor from './Editor';

vi.mock('@monaco-editor/react', () => ({
  default: (props: { language?: string; theme?: string }) => (
    <div
      data-testid="editor-monaco"
      data-language={props.language}
      data-theme={props.theme}
    />
  ),
}));

describe('Editor page', () => {
  it('renders Monaco editor preview', () => {
    render(
      <MemoryRouter initialEntries={['/app/editor']}>
        <Editor />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('editor-monaco')).toBeInTheDocument();
  });
});
