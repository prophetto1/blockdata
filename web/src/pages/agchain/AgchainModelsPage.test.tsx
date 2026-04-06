import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AgchainModelsPage from './AgchainModelsPage';

describe('AgchainModelsPage', () => {
  it('redirects the legacy /models route to /ai-providers', () => {
    render(
      <MemoryRouter initialEntries={['/app/agchain/models']}>
        <Routes>
          <Route path="/app/agchain/models" element={<AgchainModelsPage />} />
          <Route path="/app/agchain/ai-providers" element={<div>AI Providers Destination</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('AI Providers Destination')).toBeInTheDocument();
  });
});
