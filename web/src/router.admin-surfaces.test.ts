import { describe, expect, it, vi } from 'vitest';
import { AdminShellLayout } from '@/components/layout/AdminShellLayout';
import { router } from '@/router';
import { AgchainAdminGuard, BlockdataAdminGuard, SuperuserGuard } from '@/pages/superuser/SuperuserGuard';

vi.mock('react-pdf-highlighter', () => ({
  AreaHighlight: () => null,
  Highlight: () => null,
  PdfHighlighter: () => null,
  PdfLoader: () => null,
  Popup: () => null,
}));

vi.mock('react-pdf-highlighter/dist/style.css', () => ({}));

type RouteNode = {
  path?: string;
  children?: RouteNode[];
  element?: unknown;
};

function getElementType(route: RouteNode): unknown {
  if (!route.element || typeof route.element !== 'object' || !('type' in route.element)) {
    return null;
  }
  return (route.element as { type?: unknown }).type ?? null;
}

function findRouteChain(routes: RouteNode[], targetPath: string, ancestors: RouteNode[] = []): RouteNode[] | null {
  for (const route of routes) {
    const chain = [...ancestors, route];
    if (route.path === targetPath) {
      return chain;
    }
    if (route.children) {
      const match = findRouteChain(route.children, targetPath, chain);
      if (match) return match;
    }
  }
  return null;
}

function expectGuardOutsideAdminShell(path: string, expectedGuard: unknown) {
  const chain = findRouteChain(router.routes as RouteNode[], path);
  expect(chain, `expected to find route ${path}`).not.toBeNull();
  const resolvedChain = chain!;

  expect(getElementType(resolvedChain.at(-1)!)).toBe(expectedGuard);
  expect(resolvedChain.slice(0, -1).map(getElementType)).not.toContain(AdminShellLayout);
}

describe('admin surface route ancestry', () => {
  it('keeps Blockdata Admin guarded before the admin shell mounts', () => {
    expectGuardOutsideAdminShell('/app/blockdata-admin', BlockdataAdminGuard);
  });

  it('keeps AGChain Admin guarded before the admin shell mounts', () => {
    expectGuardOutsideAdminShell('/app/agchain-admin', AgchainAdminGuard);
  });

  it('keeps Superuser guarded before the admin shell mounts', () => {
    expectGuardOutsideAdminShell('/app/superuser', SuperuserGuard);
  });
});
