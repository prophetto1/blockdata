import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { AgchainSectionPage } from './AgchainSectionPage';

afterEach(() => {
  cleanup();
});

describe('AgchainSectionPage', () => {
  it('uses the shared AG chain page frame aligned to the shell content inset', () => {
    render(
      <AgchainSectionPage
        title="Runs"
        description="Run setup lives here."
        bullets={['First bullet', 'Second bullet']}
      />,
    );

    const frame = screen.getByTestId('agchain-page-frame');
    expect(frame).toHaveClass('w-full', 'px-4');
    expect(frame.className).not.toContain('max-w-');
    expect(frame.className).not.toContain('mx-auto');
  });
});
