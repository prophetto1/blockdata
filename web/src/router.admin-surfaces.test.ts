import { describe, expect, it, vi } from 'vitest';
import { Navigate } from 'react-router-dom';
import { AdminShellLayout } from '@/components/layout/AdminShellLayout';
import { router } from '@/router';
import { SuperuserGuard } from '@/pages/superuser/SuperuserGuard';

vi.mock('@/components/layout/AdminShellLayout', () => ({
  AdminShellLayout: function AdminShellLayout() {
    return null;
  },
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {},
}));

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
  index?: boolean;
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

function findIndexChild(route: RouteNode): RouteNode | null {
  return route.children?.find((child) => child.index) ?? null;
}

function expectGuardOutsideAdminShell(path: string, expectedGuard: unknown) {
  const chain = findRouteChain(router.routes as RouteNode[], path);
  expect(chain, `expected to find route ${path}`).not.toBeNull();
  const resolvedChain = chain!;

  expect(getElementType(resolvedChain.at(-1)!)).toBe(expectedGuard);
  expect(resolvedChain.slice(0, -1).map(getElementType)).not.toContain(AdminShellLayout);
}

function expectLegacyRedirect(path: string) {
  const chain = findRouteChain(router.routes as RouteNode[], path);
  expect(chain, `expected to find route ${path}`).not.toBeNull();
  const route = chain!.at(-1)!;
  const indexChild = findIndexChild(route);

  expect(indexChild).not.toBeNull();
  expect(getElementType(indexChild!)).toBe(Navigate);
  expect(chain!.map(getElementType)).not.toContain(AdminShellLayout);
}

describe('admin surface route ancestry', () => {
  it('keeps the unified superuser family guarded before the admin shell mounts', () => {
    expectGuardOutsideAdminShell('/app/superuser', SuperuserGuard);
  });

  it('keeps the legacy blockdata admin entry as a redirect', () => {
    expectLegacyRedirect('/app/blockdata-admin');
  });

  it('keeps the legacy agchain admin entry as a redirect', () => {
    expectLegacyRedirect('/app/agchain-admin');
  });
});
