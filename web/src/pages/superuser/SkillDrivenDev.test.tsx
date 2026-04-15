import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Component as SkillDrivenDev } from './SkillDrivenDev';
import { SUPERUSER_NAV_SECTIONS } from '@/components/admin/AdminLeftNav';
import routerSource from '@/router.tsx?raw';

vi.mock('@/components/common/useShellHeaderTitle', () => ({
  useShellHeaderTitle: vi.fn(),
}));

vi.mock('@/components/flows/FlowCanvas', () => ({
  default: () => <div data-testid="flow-canvas-stub" />,
}));

describe('SkillDrivenDev', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the skill-driven dev page while leaving it off the superuser nav rail', () => {
    render(<SkillDrivenDev />);

    expect(screen.getByTestId('skill-driven-dev-canvas')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Object' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Skill' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Prompt' })).toBeInTheDocument();

    expect(
      SUPERUSER_NAV_SECTIONS.flatMap((section) => section.items).some(
        (item) => item.path === '/app/superuser/skill-driven-dev',
      ),
    ).toBe(false);
    expect(routerSource).toContain("path: 'skill-driven-dev'");
  });
});
