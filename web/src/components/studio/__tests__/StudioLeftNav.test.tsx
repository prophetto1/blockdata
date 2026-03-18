import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { StudioLeftNav } from '../StudioLeftNav';

afterEach(cleanup);

function renderNav(pathname = '/app/studio') {
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <StudioLeftNav />
    </MemoryRouter>
  );
}

describe('StudioLeftNav', () => {
  it('renders nav with correct aria-label', () => {
    renderNav();
    expect(screen.getByRole('navigation', { name: /studio navigation/i })).toBeInTheDocument();
  });

  it('renders back link to main app', () => {
    renderNav();
    const back = screen.getByRole('link', { name: /back to app/i });
    expect(back).toBeInTheDocument();
    expect(back).toHaveAttribute('href', '/app/assets');
  });

  it('renders all six section nav links', () => {
    renderNav();
    expect(screen.getByRole('link', { name: /^sql$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^python$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^visual$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^tables$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^runs$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^jobs$/i })).toBeInTheDocument();
  });

  it('renders section group labels', () => {
    renderNav();
    expect(screen.getByText('STUDIO')).toBeInTheDocument();
    expect(screen.getByText('DATA')).toBeInTheDocument();
    expect(screen.getByText('HISTORY')).toBeInTheDocument();
  });

  it('marks SQL link as active on /app/studio/sql', () => {
    renderNav('/app/studio/sql');
    expect(screen.getByRole('link', { name: /^sql$/i })).toHaveAttribute('aria-current', 'page');
  });

  it('does not mark SQL link as active on /app/studio/python', () => {
    renderNav('/app/studio/python');
    expect(screen.getByRole('link', { name: /^sql$/i })).not.toHaveAttribute('aria-current', 'page');
  });
});
