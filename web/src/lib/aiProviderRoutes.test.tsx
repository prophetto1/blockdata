import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LegacyAiProvidersRedirect } from '@/components/navigation/LegacyAiProvidersRedirect';

import {
  blockdataAiProviderPath,
  blockdataAiProvidersPath,
} from './aiProviderRoutes';

describe('aiProviderRoutes', () => {
  it('builds canonical blockdata admin AI provider paths', () => {
    expect(blockdataAiProvidersPath()).toBe('/app/blockdata-admin/ai-providers');
    expect(blockdataAiProviderPath('openai')).toBe('/app/blockdata-admin/ai-providers/openai');
  });

  it('preserves providerId when redirecting a legacy AI provider detail URL', () => {
    render(
      <MemoryRouter initialEntries={['/app/settings/ai/openai']}>
        <Routes>
          <Route path="/app/settings/ai/:providerId" element={<LegacyAiProvidersRedirect />} />
          <Route path="/app/blockdata-admin/ai-providers/:providerId" element={<div>Provider detail</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Provider detail')).toBeInTheDocument();
  });

  it('redirects the legacy list URL to the canonical blockdata admin list page', () => {
    render(
      <MemoryRouter initialEntries={['/app/settings/ai']}>
        <Routes>
          <Route path="/app/settings/ai" element={<LegacyAiProvidersRedirect />} />
          <Route path="/app/blockdata-admin/ai-providers" element={<div>Provider list</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Provider list')).toBeInTheDocument();
  });

  it('preserves providerId when redirecting a legacy superuser AI provider detail URL', () => {
    render(
      <MemoryRouter initialEntries={['/app/superuser/ai-providers/openai']}>
        <Routes>
          <Route path="/app/superuser/ai-providers/:providerId" element={<LegacyAiProvidersRedirect />} />
          <Route path="/app/blockdata-admin/ai-providers/:providerId" element={<div>Superuser provider detail</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Superuser provider detail')).toBeInTheDocument();
  });
});
