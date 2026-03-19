# Admin Shell — Evidence.studio Parity

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild the admin shell to match Evidence.studio's admin layout: collapsible sidebar (220px expanded / 48px compact) with `--chrome` background, thin 36px header bar with breadcrumbs and 1px bottom border, smooth width transition.

**Architecture:** `AdminShellLayout` owns sidebar collapse state (localStorage-persisted), wraps children in `HeaderCenterProvider`. Sidebar uses the same `--chrome`/`--sidebar-*` CSS variables as the main app rail. Header bar spans the content column only (sidebar is full-height). Pages already call `useShellHeaderTitle()` — those calls become functional once the provider exists. Breadcrumb strings get normalized from stale `['Settings', 'Admin', ...]` to `['Admin', '<Page>']`.

**Tech Stack:** React, react-router-dom v6, Vitest, Testing Library, Tailwind CSS, CSS variables (`--chrome`, `--sidebar-*`)

**Design Reference:** Evidence.studio settings page screenshot. Key proportions:
- Sidebar: 220px expanded, dark `--chrome` bg, full viewport height, `1px solid var(--sidebar-border)` right border
- Nav items: ~34px tall, 16px icons, 13px labels, `--sidebar-foreground` text, `--sidebar-accent` active bg
- Section labels: 10px mono uppercase, `--sidebar-foreground` at 40% opacity
- Header: 36px, `--chrome` bg, `1px solid var(--sidebar-border)` bottom border, breadcrumbs left-aligned
- Compact mode: 48px wide, icons only, tooltips on hover

---

### Task 1: Update styleTokens for admin shell dimensions

**Files:**
- Modify: `web/src/lib/styleTokens.ts:74-76`

**Step 1: Update the admin token block**

Replace lines 74-76:

```ts
  admin: {
    navWidth: 220,
    navCompactWidth: 48,
    headerHeight: 36,
  },
```

**Step 2: Run tests to verify no breakage**

Run: `cd web && npx vitest run --reporter=verbose 2>&1 | tail -20`
Expected: PASS (token is currently unused so nothing breaks)

**Step 3: Commit**

```bash
git add web/src/lib/styleTokens.ts
git commit -m "feat(admin-shell): add navCompactWidth and headerHeight to admin styleTokens"
```

---

### Task 2: Rebuild AdminShellLayout with collapse state and header bar

**Files:**
- Modify: `web/src/components/layout/AdminShellLayout.tsx`
- Modify: `web/src/components/layout/__tests__/AdminShellLayout.test.tsx`

**Step 1: Write the failing tests**

Replace `web/src/components/layout/__tests__/AdminShellLayout.test.tsx` entirely:

```tsx
import { cleanup, render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { afterEach, beforeEach, describe, it, expect } from 'vitest';
import { AdminShellLayout } from '../AdminShellLayout';
import { useHeaderCenter } from '@/components/shell/HeaderCenterContext';

afterEach(cleanup);
beforeEach(() => { window.localStorage.clear(); });

function OutletChild() {
  return <div data-testid="outlet-child">outlet</div>;
}

function TitleSetter({ text }: { text: string }) {
  const { setCenter } = useHeaderCenter();
  useEffect(() => {
    setCenter(<span>{text}</span>);
    return () => setCenter(null);
  }, [text, setCenter]);
  return <OutletChild />;
}

function renderShell(child?: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={['/app/superuser']}>
      <Routes>
        <Route path="/app/superuser" element={<AdminShellLayout />}>
          <Route index element={child ?? <OutletChild />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('AdminShellLayout', () => {
  it('renders navigation, header, and main', () => {
    renderShell();
    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('renders the outlet child', () => {
    renderShell();
    expect(screen.getByTestId('outlet-child')).toBeInTheDocument();
  });

  it('displays breadcrumb content set by a child via HeaderCenterProvider', () => {
    renderShell(<TitleSetter text="Instance Config" />);
    expect(screen.getByText('Instance Config')).toBeInTheDocument();
  });

  it('has a sidebar toggle button in the header', () => {
    renderShell();
    expect(screen.getByRole('button', { name: /toggle/i })).toBeInTheDocument();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd web && npx vitest run src/components/layout/__tests__/AdminShellLayout.test.tsx`
Expected: FAIL — no banner role, no breadcrumb rendering, no toggle button

**Step 3: Implement AdminShellLayout**

Replace `web/src/components/layout/AdminShellLayout.tsx`:

```tsx
import { useCallback, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { IconLayoutSidebarLeftCollapse, IconLayoutSidebarLeftExpand } from '@tabler/icons-react';
import { AdminLeftNav } from '@/components/admin/AdminLeftNav';
import { HeaderCenterProvider, useHeaderCenter } from '@/components/shell/HeaderCenterContext';
import { styleTokens } from '@/lib/styleTokens';

const STORAGE_KEY = 'blockdata.admin.nav_open';

function readStored(key: string, fallback: boolean): boolean {
  if (typeof window === 'undefined') return fallback;
  const raw = window.localStorage.getItem(key);
  return raw === null ? fallback : raw === 'true';
}

/* ------------------------------------------------------------------ */
/*  Thin header bar — mirrors Evidence.studio proportions              */
/* ------------------------------------------------------------------ */

function AdminHeader({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  const { center } = useHeaderCenter();
  const Icon = expanded ? IconLayoutSidebarLeftCollapse : IconLayoutSidebarLeftExpand;

  return (
    <header
      role="banner"
      className="flex shrink-0 items-center gap-3 px-4"
      style={{
        height: styleTokens.admin.headerHeight,
        backgroundColor: 'var(--chrome, var(--background))',
        borderBottom: '1px solid var(--sidebar-border)',
      }}
    >
      <button
        type="button"
        aria-label="Toggle navigation"
        onClick={onToggle}
        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <Icon size={16} stroke={1.75} />
      </button>
      <div className="min-w-0 flex-1 overflow-hidden">{center}</div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/*  Shell layout                                                       */
/* ------------------------------------------------------------------ */

export function AdminShellLayout() {
  const [expanded, setExpanded] = useState(() => readStored(STORAGE_KEY, true));
  const toggle = useCallback(() => setExpanded((v) => !v), []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, String(expanded));
  }, [expanded]);

  return (
    <HeaderCenterProvider>
      <div className="flex h-dvh w-full overflow-hidden" style={{ backgroundColor: 'var(--background)' }}>
        <AdminLeftNav compact={!expanded} />
        <div className="relative flex flex-1 min-w-0 flex-col">
          <AdminHeader expanded={expanded} onToggle={toggle} />
          <main className="relative flex-1 min-w-0 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </HeaderCenterProvider>
  );
}
```

**Step 4: Run tests to verify they pass**

Run: `cd web && npx vitest run src/components/layout/__tests__/AdminShellLayout.test.tsx`
Expected: Will partially fail because AdminLeftNav doesn't accept `compact` yet — that's Task 3. The header/breadcrumb tests should pass.

**Step 5: Commit**

```bash
git add web/src/components/layout/AdminShellLayout.tsx web/src/components/layout/__tests__/AdminShellLayout.test.tsx
git commit -m "feat(admin-shell): rebuild layout with header bar, collapse state, HeaderCenterProvider"
```

---

### Task 3: Rebuild AdminLeftNav with Evidence.studio proportions and compact mode

The sidebar needs `--chrome` background, `--sidebar-*` text/accent colors, 220px expanded / 48px compact, smooth transition, Evidence-proportioned nav items (34px tall, 16px icons).

**Files:**
- Modify: `web/src/components/admin/AdminLeftNav.tsx`
- Modify: `web/src/components/admin/__tests__/AdminLeftNav.test.tsx`

**Step 1: Write the failing tests**

Replace `web/src/components/admin/__tests__/AdminLeftNav.test.tsx`:

```tsx
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, it, expect } from 'vitest';
import { AdminLeftNav } from '../AdminLeftNav';
import { styleTokens } from '@/lib/styleTokens';

afterEach(cleanup);

function renderNav(pathname = '/app/superuser', compact = false) {
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <AdminLeftNav compact={compact} />
    </MemoryRouter>,
  );
}

describe('AdminLeftNav', () => {
  it('renders a nav element', () => {
    renderNav();
    expect(screen.getByRole('navigation', { name: /admin/i })).toBeInTheDocument();
  });

  it('renders all nav links in expanded mode', () => {
    renderNav();
    expect(screen.getByRole('link', { name: /instance/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /workers/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /docling/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /document views/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /audit history/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /api endpoints/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /test integrations/i })).toBeInTheDocument();
  });

  it('renders a back link', () => {
    renderNav();
    expect(screen.getByRole('link', { name: /back to app/i })).toHaveAttribute('href', '/app/assets');
  });

  it('marks active link', () => {
    renderNav('/app/superuser/instance-config');
    expect(screen.getByRole('link', { name: /instance/i })).toHaveAttribute('aria-current', 'page');
  });

  it('uses expanded width when not compact', () => {
    renderNav();
    const nav = screen.getByRole('navigation', { name: /admin/i });
    expect(nav.style.width).toBe(`${styleTokens.admin.navWidth}px`);
  });

  it('uses compact width when compact', () => {
    renderNav('/app/superuser', true);
    const nav = screen.getByRole('navigation', { name: /admin/i });
    expect(nav.style.width).toBe(`${styleTokens.admin.navCompactWidth}px`);
  });

  it('hides section labels in compact mode', () => {
    renderNav('/app/superuser', true);
    expect(screen.queryByText('CONFIG')).not.toBeInTheDocument();
  });

  it('shows section labels in expanded mode', () => {
    renderNav();
    expect(screen.getByText('CONFIG')).toBeInTheDocument();
    expect(screen.getByText('DATA')).toBeInTheDocument();
    expect(screen.getByText('SYSTEM')).toBeInTheDocument();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd web && npx vitest run src/components/admin/__tests__/AdminLeftNav.test.tsx`
Expected: FAIL — AdminLeftNav doesn't accept `compact` prop, doesn't use inline width style

**Step 3: Implement AdminLeftNav**

Replace `web/src/components/admin/AdminLeftNav.tsx`:

```tsx
import { Link, useLocation } from 'react-router-dom';
import {
  IconServer,
  IconSettings,
  IconClipboardList,
  IconCode,
  IconTestPipe,
  IconFileText,
  IconChevronLeft,
  type Icon,
} from '@tabler/icons-react';
import { styleTokens } from '@/lib/styleTokens';

/* ------------------------------------------------------------------ */
/*  Nav data                                                           */
/* ------------------------------------------------------------------ */

type AdminNavItem = { label: string; icon: Icon; path: string };
type AdminNavSection = { label: string; items: AdminNavItem[] };

const NAV_SECTIONS: AdminNavSection[] = [
  {
    label: 'CONFIG',
    items: [
      { label: 'Instance', icon: IconServer, path: '/app/superuser/instance-config' },
      { label: 'Workers', icon: IconServer, path: '/app/superuser/worker-config' },
      { label: 'Docling', icon: IconSettings, path: '/app/superuser/parsers-docling' },
    ],
  },
  {
    label: 'DATA',
    items: [
      { label: 'Document Views', icon: IconFileText, path: '/app/superuser/document-views' },
    ],
  },
  {
    label: 'SYSTEM',
    items: [
      { label: 'Audit History', icon: IconClipboardList, path: '/app/superuser/audit' },
      { label: 'API Endpoints', icon: IconCode, path: '/app/superuser/api-endpoints' },
      { label: 'Test Integrations', icon: IconTestPipe, path: '/app/superuser/test-integrations' },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

type AdminLeftNavProps = { compact?: boolean };

export function AdminLeftNav({ compact = false }: AdminLeftNavProps) {
  const { pathname } = useLocation();
  const width = compact ? styleTokens.admin.navCompactWidth : styleTokens.admin.navWidth;

  return (
    <nav
      aria-label="Admin navigation"
      className="flex h-full flex-col overflow-y-auto overflow-x-hidden transition-[width] duration-200 ease-linear"
      style={{
        width,
        minWidth: width,
        backgroundColor: 'var(--chrome, var(--background))',
        borderRight: '1px solid var(--sidebar-border)',
        color: 'var(--sidebar-foreground)',
      }}
    >
      {/* Back link — like Evidence's "← Home" */}
      <div className={compact ? 'px-2 pt-3 pb-2' : 'px-3 pt-3 pb-2'}>
        <Link
          to="/app/assets"
          aria-label="Back to app"
          className={[
            'flex items-center rounded-md transition-colors',
            'hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-accent-foreground)]',
            compact ? 'justify-center p-2' : 'gap-2 px-2 py-1.5',
          ].join(' ')}
          style={{ color: 'var(--sidebar-foreground)', opacity: 0.6 }}
        >
          <IconChevronLeft size={14} stroke={2} className="shrink-0" />
          {!compact && <span className="text-xs font-medium">Back to App</span>}
        </Link>
      </div>

      {/* Divider */}
      <div className="mx-3 mb-3 h-px" style={{ backgroundColor: 'var(--sidebar-border)' }} />

      {/* Nav sections */}
      <div className={`flex flex-1 flex-col gap-5 pb-4 ${compact ? 'px-1.5' : 'px-3'}`}>
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            {!compact && (
              <p
                className="mb-1.5 px-2 text-[10px] font-mono tracking-widest"
                style={{ color: 'var(--sidebar-foreground)', opacity: 0.4 }}
              >
                {section.label}
              </p>
            )}
            <div className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.path || pathname.startsWith(item.path + '/');

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    aria-label={item.label}
                    aria-current={isActive ? 'page' : undefined}
                    title={compact ? item.label : undefined}
                    className={[
                      'flex items-center rounded-md transition-colors',
                      compact ? 'justify-center p-2' : 'gap-2.5 px-2 text-[13px]',
                    ].join(' ')}
                    style={{
                      height: 34,
                      backgroundColor: isActive ? 'var(--sidebar-accent)' : undefined,
                      color: isActive
                        ? 'var(--sidebar-accent-foreground)'
                        : 'var(--sidebar-foreground)',
                      opacity: isActive ? 1 : 0.75,
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'var(--sidebar-accent)';
                        e.currentTarget.style.opacity = '1';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = '';
                        e.currentTarget.style.opacity = '0.75';
                      }
                    }}
                  >
                    <item.icon size={16} stroke={isActive ? 2 : 1.75} className="shrink-0" />
                    {!compact && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </nav>
  );
}
```

**Step 4: Run tests**

Run: `cd web && npx vitest run src/components/admin/__tests__/AdminLeftNav.test.tsx`
Expected: PASS

**Step 5: Also run the layout tests since AdminShellLayout now passes `compact` prop**

Run: `cd web && npx vitest run src/components/layout/__tests__/AdminShellLayout.test.tsx`
Expected: PASS

**Step 6: Commit**

```bash
git add web/src/components/admin/AdminLeftNav.tsx web/src/components/admin/__tests__/AdminLeftNav.test.tsx
git commit -m "feat(admin-shell): rebuild AdminLeftNav with Evidence.studio proportions and compact mode"
```

---

### Task 4: Normalize breadcrumbs across all superuser pages

Breadcrumbs still say `['Settings', 'Admin', ...]` from the old Settings-nested layout. Now that these pages live in their own admin shell, change to `['Admin', '<Page>']`.

**Files:**
- Modify: `web/src/pages/superuser/SuperuserInstanceConfig.tsx:5`
- Modify: `web/src/pages/superuser/SuperuserWorkerConfig.tsx:5`
- Modify: `web/src/pages/superuser/SuperuserAuditHistory.tsx:94`
- Modify: `web/src/pages/superuser/SuperuserApiEndpoints.tsx:108`
- Modify: `web/src/pages/superuser/SuperuserDocumentViews.tsx:26`
- Modify: `web/src/pages/settings/DoclingConfigPanel.tsx:517`

**Step 1: Update each call**

`SuperuserInstanceConfig.tsx:5` — change to:
```tsx
  useShellHeaderTitle({ title: 'Instance Config', breadcrumbs: ['Admin', 'Instance Config'] });
```

`SuperuserWorkerConfig.tsx:5` — change to:
```tsx
  useShellHeaderTitle({ title: 'Worker Config', breadcrumbs: ['Admin', 'Worker Config'] });
```

`SuperuserAuditHistory.tsx:94` — change to:
```tsx
  useShellHeaderTitle({ title: 'Audit History', breadcrumbs: ['Admin', 'Audit History'] });
```

`SuperuserApiEndpoints.tsx:108` — change to:
```tsx
  useShellHeaderTitle({ title: 'API Endpoints', breadcrumbs: ['Admin', 'API Endpoints'] });
```

`SuperuserDocumentViews.tsx:26` — change to:
```tsx
  useShellHeaderTitle({ title: 'Block Types', breadcrumbs: ['Admin', 'Block Types'] });
```

`DoclingConfigPanel.tsx:517` — change to:
```tsx
  useShellHeaderTitle({ title: 'Profiles', breadcrumbs: ['Admin', 'Docling Profiles'] });
```

**Step 2: Run admin tests**

Run: `cd web && npx vitest run src/components/layout/__tests__/AdminShellLayout.test.tsx src/components/admin/__tests__/AdminLeftNav.test.tsx`
Expected: PASS

**Step 3: Commit**

```bash
git add web/src/pages/superuser/SuperuserInstanceConfig.tsx web/src/pages/superuser/SuperuserWorkerConfig.tsx web/src/pages/superuser/SuperuserAuditHistory.tsx web/src/pages/superuser/SuperuserApiEndpoints.tsx web/src/pages/superuser/SuperuserDocumentViews.tsx web/src/pages/settings/DoclingConfigPanel.tsx
git commit -m "fix(admin-shell): normalize breadcrumbs to Admin > Page"
```

---

### Task 5: Add missing settings-nav path aliases

**Files:**
- Modify: `web/src/pages/settings/settings-nav.ts:51-60`
- Modify: `web/src/pages/settings/settings-nav.test.ts`

**Step 1: Write the failing test**

Add to `web/src/pages/settings/settings-nav.test.ts`:

```ts
  it('resolves superuser api-endpoints and test-integrations to admin nav item', () => {
    for (const sub of ['api-endpoints', 'test-integrations']) {
      const item = findNavItemByPath(`/app/superuser/${sub}`);
      expect(item?.id).toBe('admin-services');
    }
  });
```

**Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run src/pages/settings/settings-nav.test.ts`
Expected: FAIL

**Step 3: Add the aliases**

In `web/src/pages/settings/settings-nav.ts`, add after line 59 (after the `document-views` entry):

```ts
  { prefix: '/app/superuser/api-endpoints', targetId: 'admin-services' },
  { prefix: '/app/superuser/test-integrations', targetId: 'admin-services' },
```

**Step 4: Run test**

Run: `cd web && npx vitest run src/pages/settings/settings-nav.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add web/src/pages/settings/settings-nav.ts web/src/pages/settings/settings-nav.test.ts
git commit -m "fix(admin-shell): add missing path aliases for api-endpoints and test-integrations"
```

---

### Task 6: Add routing-boundary integration test

**Files:**
- Create: `web/src/components/layout/__tests__/admin-routing-boundary.test.tsx`

**Step 1: Write the test**

```tsx
import { describe, it, expect } from 'vitest';
import { router } from '@/router';

function collectPaths(routes: typeof router.routes, prefix = ''): string[] {
  const paths: string[] = [];
  for (const route of routes) {
    const full = route.path ? `${prefix}/${route.path}`.replace(/\/+/g, '/') : prefix;
    paths.push(full);
    if (route.children) paths.push(...collectPaths(route.children, full));
  }
  return paths;
}

describe('admin routing boundary', () => {
  it('/app/superuser routes live outside AppLayout', () => {
    const rootRoute = router.routes.find((r) => r.children?.some((c) => c.path === '/app'));
    const authRoute = rootRoute?.children?.find((c) => c.path === '/app');
    expect(authRoute).toBeDefined();

    const siblings = authRoute!.children ?? [];
    const appLayoutChild = siblings[0]; // AppLayout is first child
    const appLayoutPaths = collectPaths(appLayoutChild.children ?? []);

    expect(appLayoutPaths.some((p) => p.includes('superuser'))).toBe(false);

    const adminChild = siblings.find((c) => c.children?.some((gc) => gc.path === '/app/superuser'));
    expect(adminChild).toBeDefined();
  });
});
```

**Step 2: Run test**

Run: `cd web && npx vitest run src/components/layout/__tests__/admin-routing-boundary.test.tsx`
Expected: PASS

**Step 3: Commit**

```bash
git add web/src/components/layout/__tests__/admin-routing-boundary.test.tsx
git commit -m "test(admin-shell): assert admin routes live outside AppLayout"
```

---

### Task 7: Full test suite

**Step 1: Run all admin tests**

Run: `cd web && npx vitest run src/components/layout/__tests__/AdminShellLayout.test.tsx src/components/admin/__tests__/AdminLeftNav.test.tsx src/pages/settings/settings-nav.test.ts src/components/layout/__tests__/admin-routing-boundary.test.tsx`
Expected: ALL PASS

**Step 2: Run full suite for regressions**

Run: `cd web && npx vitest run`
Expected: PASS
