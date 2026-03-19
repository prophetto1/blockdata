# Admin Shell Cleanup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Keep the existing two admin rail containers and the first rail's resize behavior, move admin page menus left by one rail, and remove all page-level third-rail navigation from superuser screens.

**Architecture:** `AdminShellLayout` keeps two fixed left asides. Rail 1 stops rendering platform nav and instead renders top-level superuser destinations. Rail 2 stops rendering top-level admin pages and instead renders page-local secondary navigation. Page components that currently render their own internal left navs are unwired so those menus live in rail 2 instead of inside page content.

**Tech Stack:** React, TypeScript, react-router-dom v6, Vitest, Testing Library

---

### Task 1: Create shared admin rail config and lock the new contract with tests

**Files:**
- Create: `web/src/components/admin/admin-shell-nav.ts`
- Create: `web/src/components/admin/__tests__/admin-shell-nav.test.ts`

**Step 1: Write the failing tests**

Create `web/src/components/admin/__tests__/admin-shell-nav.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  ADMIN_PRIMARY_RAIL,
  getAdminSecondaryRail,
} from '../admin-shell-nav';

describe('admin shell nav config', () => {
  it('defines top-level admin destinations for rail 1', () => {
    const labels = ADMIN_PRIMARY_RAIL.flatMap((section) => section.items.map((item) => item.label));

    expect(labels).toContain('Instance');
    expect(labels).toContain('Workers');
    expect(labels).toContain('Docling');
    expect(labels).toContain('Document Views');
    expect(labels).toContain('Audit History');
    expect(labels).toContain('API Endpoints');
    expect(labels).toContain('Test Integrations');
    expect(labels).toContain('Layout Captures');
  });

  it('maps instance-config to former third-rail section links', () => {
    const rail = getAdminSecondaryRail('/app/superuser/instance-config');
    const labels = rail.flatMap((section) => section.items.map((item) => item.label));

    expect(labels).toEqual([
      'Jobs',
      'Workers',
      'Registries',
      'Alerts',
      'Observability',
      'Secret Storage',
    ]);
  });

  it('maps worker-config to former third-rail section links', () => {
    const rail = getAdminSecondaryRail('/app/superuser/worker-config');
    const labels = rail.flatMap((section) => section.items.map((item) => item.label));

    expect(labels).toEqual(['Batching', 'Queue Claims', 'General']);
  });

  it('maps docling routes to the former in-page route switcher', () => {
    const profiles = getAdminSecondaryRail('/app/superuser/parsers-docling');
    const blockTypes = getAdminSecondaryRail('/app/superuser/document-views');

    expect(profiles[0]?.items.map((item) => item.label)).toEqual(['Profiles', 'Block Types']);
    expect(blockTypes[0]?.items.map((item) => item.label)).toEqual(['Profiles', 'Block Types']);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run src/components/admin/__tests__/admin-shell-nav.test.ts --reporter=verbose`

Expected: FAIL because `admin-shell-nav.ts` does not exist yet.

**Step 3: Write the shared rail config**

Create `web/src/components/admin/admin-shell-nav.ts`:

```ts
import {
  IconCamera,
  IconClipboardList,
  IconCode,
  IconFileText,
  IconServer,
  IconSettings,
  IconTestPipe,
  type Icon,
} from '@tabler/icons-react';

export type AdminRailItem = {
  label: string;
  icon?: Icon;
  path: string;
};

export type AdminRailSection = {
  label: string;
  items: AdminRailItem[];
};

export const ADMIN_PRIMARY_RAIL: AdminRailSection[] = [
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
  {
    label: 'DESIGN',
    items: [
      { label: 'Layout Captures', icon: IconCamera, path: '/app/superuser/design-layout-captures' },
    ],
  },
];

const INSTANCE_SECONDARY: AdminRailSection[] = [
  {
    label: 'INSTANCE',
    items: [
      { label: 'Jobs', path: '/app/superuser/instance-config#jobs' },
      { label: 'Workers', path: '/app/superuser/instance-config#workers' },
      { label: 'Registries', path: '/app/superuser/instance-config#registries' },
      { label: 'Alerts', path: '/app/superuser/instance-config#alerts' },
      { label: 'Observability', path: '/app/superuser/instance-config#observability' },
      { label: 'Secret Storage', path: '/app/superuser/instance-config#secret-storage' },
    ],
  },
];

const WORKER_SECONDARY: AdminRailSection[] = [
  {
    label: 'WORKER',
    items: [
      { label: 'Batching', path: '/app/superuser/worker-config#batching' },
      { label: 'Queue Claims', path: '/app/superuser/worker-config#queue' },
      { label: 'General', path: '/app/superuser/worker-config#general' },
    ],
  },
];

const DOCLING_SECONDARY: AdminRailSection[] = [
  {
    label: 'DOCLING',
    items: [
      { label: 'Profiles', path: '/app/superuser/parsers-docling' },
      { label: 'Block Types', path: '/app/superuser/document-views' },
    ],
  },
];

export function getAdminSecondaryRail(pathname: string): AdminRailSection[] {
  if (pathname.startsWith('/app/superuser/instance-config')) return INSTANCE_SECONDARY;
  if (pathname.startsWith('/app/superuser/worker-config')) return WORKER_SECONDARY;
  if (
    pathname.startsWith('/app/superuser/parsers-docling')
    || pathname.startsWith('/app/superuser/document-views')
  ) {
    return DOCLING_SECONDARY;
  }
  return [];
}
```

**Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run src/components/admin/__tests__/admin-shell-nav.test.ts --reporter=verbose`

Expected: PASS

**Step 5: Commit**

```bash
git add web/src/components/admin/admin-shell-nav.ts web/src/components/admin/__tests__/admin-shell-nav.test.ts
git commit -m "test(admin): define shared two-rail nav contract"
```

---

### Task 2: Replace rail 1 menu content with a dedicated admin primary rail

**Files:**
- Create: `web/src/components/admin/AdminPrimaryRail.tsx`
- Create: `web/src/components/admin/__tests__/AdminPrimaryRail.test.tsx`

**Step 1: Write the failing test**

Create `web/src/components/admin/__tests__/AdminPrimaryRail.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { AdminPrimaryRail } from '../AdminPrimaryRail';

describe('AdminPrimaryRail', () => {
  it('renders a Go to App entry instead of the platform brand menu', () => {
    render(
      <MemoryRouter initialEntries={['/app/superuser/instance-config']}>
        <AdminPrimaryRail userLabel="jon@example.com" onSignOut={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /go to app/i })).toHaveAttribute('href', '/app');
    expect(screen.queryByText('Assets')).not.toBeInTheDocument();
  });

  it('renders top-level superuser destinations in the first rail', () => {
    render(
      <MemoryRouter initialEntries={['/app/superuser/instance-config']}>
        <AdminPrimaryRail userLabel="jon@example.com" onSignOut={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /instance/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /workers/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /docling/i })).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run src/components/admin/__tests__/AdminPrimaryRail.test.tsx --reporter=verbose`

Expected: FAIL because `AdminPrimaryRail.tsx` does not exist yet.

**Step 3: Write the minimal component**

Create `web/src/components/admin/AdminPrimaryRail.tsx`:

```tsx
import { Link, useLocation } from 'react-router-dom';
import { IconArrowLeft, IconDots, type Icon } from '@tabler/icons-react';
import { Avatar } from '@ark-ui/react/avatar';
import { ADMIN_PRIMARY_RAIL } from './admin-shell-nav';
import { cn } from '@/lib/utils';

type AdminPrimaryRailProps = {
  userLabel?: string;
  onSignOut?: () => void | Promise<void>;
};

export function AdminPrimaryRail({ userLabel }: AdminPrimaryRailProps) {
  const { pathname } = useLocation();
  const initial = userLabel?.match(/[A-Za-z0-9]/)?.[0]?.toUpperCase() ?? '?';

  return (
    <nav aria-label="Admin primary navigation" className="flex h-full min-h-0 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-[60px] items-center border-b border-sidebar-border px-3">
        <Link
          to="/app"
          aria-label="Go to App"
          className="inline-flex items-center gap-2 rounded-md px-1.5 py-1 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <IconArrowLeft size={16} stroke={1.9} />
          <span>Go to App</span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3">
        {ADMIN_PRIMARY_RAIL.map((section) => (
          <div key={section.label} className="mb-4">
            <p className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/45">
              {section.label}
            </p>
            {section.items.map((item) => {
              const active = pathname === item.path || pathname.startsWith(item.path + '/');
              const ItemIcon = item.icon as Icon | undefined;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] transition-colors',
                    active
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/72 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  )}
                >
                  {ItemIcon ? <ItemIcon size={15} stroke={active ? 2 : 1.75} className="shrink-0" /> : null}
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      <div className="border-t border-sidebar-border px-3 py-2">
        <div className="flex items-center gap-2">
          <Avatar.Root className="h-6 w-6">
            <Avatar.Fallback className="flex h-full w-full items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
              {initial}
            </Avatar.Fallback>
          </Avatar.Root>
          <span className="min-w-0 flex-1 truncate text-sm">{userLabel ?? initial}</span>
          <IconDots size={16} stroke={1.75} className="text-sidebar-foreground/50" />
        </div>
      </div>
    </nav>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run src/components/admin/__tests__/AdminPrimaryRail.test.tsx --reporter=verbose`

Expected: PASS

**Step 5: Commit**

```bash
git add web/src/components/admin/AdminPrimaryRail.tsx web/src/components/admin/__tests__/AdminPrimaryRail.test.tsx
git commit -m "feat(admin): add primary rail for superuser shell"
```

---

### Task 3: Rewire rail 2 so it renders former third-rail menus

**Files:**
- Modify: `web/src/components/admin/AdminLeftNav.tsx`
- Modify: `web/src/components/admin/__tests__/AdminLeftNav.test.tsx`

**Step 1: Write the failing tests**

Update `web/src/components/admin/__tests__/AdminLeftNav.test.tsx`:

```tsx
it('renders instance section links for instance-config routes', () => {
  renderNav('/app/superuser/instance-config');
  expect(screen.getByRole('link', { name: 'Jobs' })).toHaveAttribute('href', '/app/superuser/instance-config#jobs');
  expect(screen.getByRole('link', { name: 'Secret Storage' })).toHaveAttribute('href', '/app/superuser/instance-config#secret-storage');
});

it('renders docling route links for docling routes', () => {
  renderNav('/app/superuser/parsers-docling');
  expect(screen.getByRole('link', { name: 'Profiles' })).toHaveAttribute('href', '/app/superuser/parsers-docling');
  expect(screen.getByRole('link', { name: 'Block Types' })).toHaveAttribute('href', '/app/superuser/document-views');
});

it('does not render top-level admin pages in rail 2 anymore', () => {
  renderNav('/app/superuser/instance-config');
  expect(screen.queryByRole('link', { name: /^instance$/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /^audit history$/i })).not.toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run src/components/admin/__tests__/AdminLeftNav.test.tsx --reporter=verbose`

Expected: FAIL because `AdminLeftNav` still renders top-level admin pages.

**Step 3: Replace the static page list with contextual secondary items**

Modify `web/src/components/admin/AdminLeftNav.tsx`:

```tsx
import { Link, useLocation } from 'react-router-dom';
import { getAdminSecondaryRail } from './admin-shell-nav';

export function AdminLeftNav() {
  const location = useLocation();
  const sections = getAdminSecondaryRail(location.pathname);

  return (
    <nav
      aria-label="Admin secondary navigation"
      data-testid="admin-secondary-rail"
      className="flex h-full w-[184px] min-w-[184px] flex-col overflow-y-auto overflow-x-hidden border-r border-sidebar-border px-2 py-3"
      style={{ backgroundColor: 'var(--sidebar-accent)' }}
    >
      {sections.length === 0 ? (
        <div className="px-2.5 py-2 text-xs text-sidebar-foreground/55">
          No secondary navigation for this page.
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-4 px-1 pb-2">
          {sections.map((section) => (
            <div key={section.label}>
              <p className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/45">
                {section.label}
              </p>
              {section.items.map((item) => {
                const active = location.pathname === item.path
                  || location.pathname.startsWith(item.path + '/')
                  || location.pathname + location.hash === item.path;

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    aria-current={active ? 'page' : undefined}
                    className={[
                      'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] transition-colors',
                      active
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-sidebar-foreground/72 hover:bg-background/60 hover:text-foreground',
                    ].join(' ')}
                  >
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </nav>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run src/components/admin/__tests__/AdminLeftNav.test.tsx --reporter=verbose`

Expected: PASS

**Step 5: Commit**

```bash
git add web/src/components/admin/AdminLeftNav.tsx web/src/components/admin/__tests__/AdminLeftNav.test.tsx
git commit -m "feat(admin): make secondary rail route-contextual"
```

---

### Task 4: Rewire `AdminShellLayout` without changing the two-rail shell or resize handle

**Files:**
- Modify: `web/src/components/layout/AdminShellLayout.tsx`
- Modify: `web/src/components/layout/__tests__/AdminShellLayout.test.tsx`

**Step 1: Write the failing test**

Update `web/src/components/layout/__tests__/AdminShellLayout.test.tsx`:

```tsx
vi.mock('@/components/admin/AdminPrimaryRail', () => ({
  AdminPrimaryRail: () => <div data-testid="mock-admin-primary-rail">admin rail</div>,
}));

it('renders the admin primary rail, admin secondary rail, and main area', () => {
  renderWithRouter();
  expect(screen.getByTestId('mock-admin-primary-rail')).toBeInTheDocument();
  expect(screen.getByTestId('admin-secondary-rail')).toBeInTheDocument();
  expect(screen.queryByTestId('mock-platform-rail-content')).not.toBeInTheDocument();
});

it('keeps the resize separator in the first rail', () => {
  renderWithRouter();
  expect(screen.getByRole('separator')).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run src/components/layout/__tests__/AdminShellLayout.test.tsx --reporter=verbose`

Expected: FAIL because `AdminShellLayout` still imports `LeftRailShadcn`.

**Step 3: Replace the platform rail renderer, keep the shell geometry**

Modify `web/src/components/layout/AdminShellLayout.tsx`:

```tsx
import { AdminLeftNav } from '@/components/admin/AdminLeftNav';
import { AdminPrimaryRail } from '@/components/admin/AdminPrimaryRail';

// Keep SIDEBAR_WIDTH_KEY, ADMIN_SECONDARY_RAIL_WIDTH, resize state, and mainStyle math.

<aside data-testid="admin-primary-rail" style={{ ... }}>
  <AdminPrimaryRail
    userLabel={profile?.display_name || profile?.email || user?.email}
    onSignOut={handleSignOut}
  />
  <div role="separator" ... />
</aside>

<aside style={{ insetInlineStart: `${sidebarWidth}px`, width: `${ADMIN_SECONDARY_RAIL_WIDTH}px` }}>
  <AdminLeftNav />
</aside>
```

Do **not** remove:

- `sidebarWidth`
- `handleResizeStart`
- localStorage persistence for rail width
- the two fixed `<aside>` containers
- `mainStyle.insetInlineStart = sidebarWidth + ADMIN_SECONDARY_RAIL_WIDTH`

Do remove:

- `LeftRailShadcn` import
- `disableAutoDrill` from the admin shell path

**Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run src/components/layout/__tests__/AdminShellLayout.test.tsx --reporter=verbose`

Expected: PASS

**Step 5: Commit**

```bash
git add web/src/components/layout/AdminShellLayout.tsx web/src/components/layout/__tests__/AdminShellLayout.test.tsx
git commit -m "feat(admin): rewire shell rails without changing layout chrome"
```

---

### Task 5: Delete the page-level third rails and move those menus into rail 2

**Files:**
- Modify: `web/src/pages/settings/InstanceConfigPanel.tsx`
- Modify: `web/src/pages/settings/WorkerConfigPanel.tsx`
- Modify: `web/src/pages/settings/DoclingConfigPanel.tsx`
- Modify: `web/src/pages/superuser/SuperuserDocumentViews.tsx`
- Modify: `web/src/pages/settings/InstanceConfigPanel.test.tsx`
- Create: `web/src/pages/settings/WorkerConfigPanel.test.tsx`

**Step 1: Write the failing tests**

Update `web/src/pages/settings/InstanceConfigPanel.test.tsx` so it asserts the page no longer renders an internal nav and instead renders stacked sections with anchor targets:

```tsx
expect(await screen.findByRole('heading', { name: 'Jobs' })).toBeInTheDocument();
expect(screen.getByRole('heading', { name: 'Workers' })).toBeInTheDocument();
expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
```

Create `web/src/pages/settings/WorkerConfigPanel.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { WorkerConfigPanel } from './WorkerConfigPanel';

const edgeFetchMock = vi.fn();

vi.mock('@/lib/edge', () => ({
  edgeFetch: (...args: unknown[]) => edgeFetchMock(...args),
}));

describe('WorkerConfigPanel', () => {
  it('renders all worker sections as stacked content sections', async () => {
    edgeFetchMock.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ policies: [] }),
    });

    render(<WorkerConfigPanel />);

    expect(await screen.findByRole('heading', { name: 'Batching' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Queue Claims' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'General' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd web && npx vitest run src/pages/settings/InstanceConfigPanel.test.tsx src/pages/settings/WorkerConfigPanel.test.tsx --reporter=verbose`

Expected: FAIL because both panels still render their own left nav and do not render stacked sections.

**Step 3: Remove page-level nav wrappers and stack the sections in content**

For `web/src/pages/settings/InstanceConfigPanel.tsx`:

- Remove `activeSection` state and the entire `<nav className="w-56 ...">...</nav>` block.
- Render all sections in order inside the main content column.
- Give each section a stable anchor id matching the rail-2 links.

Example:

```tsx
return (
  <div className="h-full overflow-y-auto px-6">
    {status ? <div>...</div> : null}
    {error ? <div>...</div> : null}

    {dirtyKeys.size > 0 ? (
      <div className="mb-4 flex justify-end">
        <Button ...>{savingKey === '__all__' ? 'Saving...' : `Save all (${dirtyKeys.size})`}</Button>
      </div>
    ) : null}

    <div className="space-y-8 pb-6">
      {SECTIONS.map((section) => (
        <section key={section.id} id={section.id} className="scroll-mt-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">{section.label}</h2>
            <p className="text-xs text-muted-foreground">
              {section.settings.length} setting{section.settings.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="space-y-3">
            {section.settings.map((setting) => (
              <SettingCard ... />
            ))}
          </div>
        </section>
      ))}
    </div>
  </div>
);
```

Apply the same pattern to `web/src/pages/settings/WorkerConfigPanel.tsx`.

For `web/src/pages/settings/DoclingConfigPanel.tsx` and `web/src/pages/superuser/SuperuserDocumentViews.tsx`:

- Remove the small internal left `<nav className="w-56 ...">` switcher.
- Keep only the content panel.
- Let rail 2 handle the `Profiles` / `Block Types` route switching.

**Step 4: Run tests to verify they pass**

Run: `cd web && npx vitest run src/pages/settings/InstanceConfigPanel.test.tsx src/pages/settings/WorkerConfigPanel.test.tsx --reporter=verbose`

Expected: PASS

**Step 5: Commit**

```bash
git add web/src/pages/settings/InstanceConfigPanel.tsx web/src/pages/settings/WorkerConfigPanel.tsx web/src/pages/settings/DoclingConfigPanel.tsx web/src/pages/superuser/SuperuserDocumentViews.tsx web/src/pages/settings/InstanceConfigPanel.test.tsx web/src/pages/settings/WorkerConfigPanel.test.tsx
git commit -m "refactor(admin): move page-level third-rail menus into shell rail"
```

---

### Task 6: Remove stale `Settings -> Admin` wiring and relabel superuser headers

**Files:**
- Modify: `web/src/components/shell/nav-config.ts`
- Modify: `web/src/components/shell/nav-config.test.ts`
- Modify: `web/src/pages/settings/settings-nav.ts`
- Modify: `web/src/pages/settings/settings-nav.test.ts`
- Modify: `web/src/components/common/useShellHeaderTitle.tsx`
- Modify: `web/src/pages/superuser/SuperuserInstanceConfig.tsx`
- Modify: `web/src/pages/superuser/SuperuserWorkerConfig.tsx`
- Modify: `web/src/pages/superuser/SuperuserAuditHistory.tsx`
- Modify: `web/src/pages/settings/DoclingConfigPanel.tsx`
- Modify: `web/src/pages/superuser/SuperuserDocumentViews.tsx`

**Step 1: Write the failing tests**

Add to `web/src/components/shell/nav-config.test.ts`:

```ts
it('settings drill no longer contains admin/superuser paths', () => {
  const settings = getDrillConfig('settings')!;
  const allPaths = settings.sections.flatMap((section) => section.items.map((item) => item.path));
  expect(allPaths.some((path) => path.includes('/app/superuser'))).toBe(false);
});
```

Replace `web/src/pages/settings/settings-nav.test.ts` with:

```ts
import { describe, expect, it } from 'vitest';
import { findNavItemByPath } from './settings-nav';

describe('settings nav', () => {
  it('does not claim superuser routes as settings nav items anymore', () => {
    expect(findNavItemByPath('/app/superuser/instance-config')).toBeNull();
    expect(findNavItemByPath('/app/settings/admin/instance-config')).toBeNull();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd web && npx vitest run src/components/shell/nav-config.test.ts src/pages/settings/settings-nav.test.ts --reporter=verbose`

Expected: FAIL because `Settings -> Admin` is still present in both helpers.

**Step 3: Remove the stale settings/admin references and fix the superuser label**

In `web/src/components/shell/nav-config.ts`, delete:

```ts
{ label: 'Admin', icon: IconServer, path: '/app/superuser/instance-config' },
```

In `web/src/pages/settings/settings-nav.ts`, delete:

- the `admin-services` item
- all `ADMIN_PATH_ALIASES`

and let `findNavItemByPath` return `null` for superuser paths.

In `web/src/components/common/useShellHeaderTitle.tsx`, split the current combined branch:

```ts
if (pathname.startsWith('/app/settings')) return 'Settings';
if (pathname.startsWith('/app/superuser')) return 'Superuser';
```

Update superuser breadcrumbs so they stop saying `Settings / Admin / ...`. Use:

```ts
useShellHeaderTitle({ title: 'Instance Config', breadcrumbs: ['Superuser', 'Instance Config'] });
useShellHeaderTitle({ title: 'Worker Config', breadcrumbs: ['Superuser', 'Worker Config'] });
useShellHeaderTitle({ title: 'Audit History', breadcrumbs: ['Superuser', 'Audit History'] });
useShellHeaderTitle({ title: 'Profiles', breadcrumbs: ['Superuser', 'Docling', 'Profiles'] });
useShellHeaderTitle({ title: 'Block Types', breadcrumbs: ['Superuser', 'Docling', 'Block Types'] });
```

**Step 4: Run tests to verify they pass**

Run: `cd web && npx vitest run src/components/shell/nav-config.test.ts src/pages/settings/settings-nav.test.ts --reporter=verbose`

Expected: PASS

**Step 5: Commit**

```bash
git add web/src/components/shell/nav-config.ts web/src/components/shell/nav-config.test.ts web/src/pages/settings/settings-nav.ts web/src/pages/settings/settings-nav.test.ts web/src/components/common/useShellHeaderTitle.tsx web/src/pages/superuser/SuperuserInstanceConfig.tsx web/src/pages/superuser/SuperuserWorkerConfig.tsx web/src/pages/superuser/SuperuserAuditHistory.tsx web/src/pages/settings/DoclingConfigPanel.tsx web/src/pages/superuser/SuperuserDocumentViews.tsx
git commit -m "fix(admin): remove stale settings wiring for superuser"
```

---

### Task 7: Run focused regression tests for the rewired shell

**Step 1: Run the focused shell and panel suite**

Run:

```bash
cd web && npx vitest run \
  src/components/admin/__tests__/admin-shell-nav.test.ts \
  src/components/admin/__tests__/AdminPrimaryRail.test.tsx \
  src/components/admin/__tests__/AdminLeftNav.test.tsx \
  src/components/layout/__tests__/AdminShellLayout.test.tsx \
  src/pages/settings/InstanceConfigPanel.test.tsx \
  src/pages/settings/WorkerConfigPanel.test.tsx \
  src/components/shell/nav-config.test.ts \
  src/pages/settings/settings-nav.test.ts \
  --reporter=verbose
```

Expected: PASS

**Step 2: Run a wider regression sweep**

Run:

```bash
cd web && npx vitest run src/pages/superuser src/components/layout src/components/admin --reporter=verbose
```

Expected: PASS

**Step 3: Smoke-check the live layout manually**

Run the app and verify:

1. `/app/superuser/instance-config`
2. `/app/superuser/worker-config`
3. `/app/superuser/parsers-docling`
4. `/app/superuser/document-views`
5. `/app/superuser/audit`

Expected:

- Rail 1 is admin nav, not platform nav
- Rail 1 still resizes
- Rail 2 shows former third-rail menus for pages that had them
- Page body no longer contains its own internal left nav
- There is no third rail anywhere in the superuser shell

**Step 4: Commit final verification-only checkpoint**

```bash
git status
```

Expected: clean working tree
