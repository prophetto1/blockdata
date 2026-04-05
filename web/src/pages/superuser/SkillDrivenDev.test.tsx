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

  it('renders the skill-driven dev page and registers the superuser nav/route entry', () => {
    render(<SkillDrivenDev />);

    expect(screen.getByRole('heading', { level: 1, name: 'Skill-Driven Dev' })).toBeInTheDocument();
    expect(screen.getByText('Plan Contract')).toBeInTheDocument();
    expect(screen.getByText('Instruction Layer')).toBeInTheDocument();
    expect(screen.getByText('Execution Discipline')).toBeInTheDocument();

    const devOnlySection = SUPERUSER_NAV_SECTIONS.find((section) => section.label === 'DEV ONLY');
    expect(devOnlySection?.items.some((item) => item.path === '/app/superuser/skill-driven-dev')).toBe(true);
    expect(routerSource).toContain("path: 'skill-driven-dev'");
  });
});
