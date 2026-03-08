---
title: Icon Unification Plan
description: Consolidate Tabler, Lucide, and Hugeicons into a single Hugeicons-only icon system.
---

**Goal:** Consolidate three icon libraries (Tabler, Lucide, Hugeicons) into Hugeicons-only, behind a redesigned `AppIcon` abstraction with enforced size/stroke/tone contracts.

**Architecture:** A single `AppIcon` component wraps `HugeiconsIcon` with semantic tokens (context, size, stroke, tone). Every icon in the app passes through `AppIcon` — no raw `<HugeiconsIcon>` or inline SVGs outside it. The existing `ToolbarButton` delegates to `AppIcon` internally. Migration proceeds file-by-file using a verified mapping table.

**Tech Stack:** React 19, `@hugeicons/react` + `@hugeicons/core-free-icons`, Tailwind CSS 4, TypeScript

---

## Current State

| Library | Files | Usages | Role |
|---------|-------|--------|------|
| `@tabler/icons-react` | 50+ | 93 components | Primary (legacy) |
| `@hugeicons/core-free-icons` | 8 | ~15 components | Migration target |
| `lucide-react` | 6 | ~10 components | Scattered in UI primitives |

**Existing abstractions:**
- `web/src/components/ui/app-icon.tsx` — wraps Tabler `Icon` type with semantic tokens
- `web/src/lib/icon-contract.ts` — size/stroke/tone/context tokens
- `web/src/lib/iconTokens.ts` — legacy tokens (to be removed)
- `web/src/components/ui/toolbar-button.tsx` — wraps Hugeicons separately

---

## Icon Mapping: Tabler → Hugeicons

Every Tabler icon used in the codebase maps to a Hugeicons equivalent. **Verify each visually during migration** — some may need adjustment.

| Tabler Icon | Hugeicons Equivalent | Used In |
|---|---|---|
| `IconCheck` | `Tick01Icon` | LeftRailShadcn, ApiPlayground, settings |
| `IconChevronDown` | `ArrowDown01Icon` | LeftRailShadcn, native-select, settings |
| `IconChevronRight` | `ArrowRight01Icon` | ApiPlayground, FunctionRef, settings |
| `IconChevronLeft` | `ArrowLeft01Icon` | SchemaLayout, PptxPreview |
| `IconLayoutColumns` | `Layout03Icon` | LeftRailShadcn |
| `IconPlus` | `Add01Icon` | LeftRailShadcn, FlowDetail |
| `IconX` | `Cancel01Icon` | FlowDetail, ServiceDetailPanel |
| `IconArrowRight` | `ArrowRight02Icon` | Landing, EarlyAccess, BottomCTA |
| `IconUpload` | `Upload04Icon` | Landing |
| `IconBolt` | `FlashIcon` | Landing |
| `IconChecks` | `TickDouble01Icon` | Landing |
| `IconTable` | `GridTableIcon` | Landing, settings-nav |
| `IconFileText` | `File02Icon` | Landing, DocxPreview |
| `IconDatabase` | `DatabaseIcon` | Landing, DatabasePlaceholder, settings-nav |
| `IconFileExport` | `FileExportIcon` | Landing |
| `IconTransform` | `ArrowDataTransferHorizontalIcon` | Landing |
| `IconCode` | `CodeIcon` | Landing, settings, nav-config |
| `IconBrain` | `AiBrain01Icon` | Landing, providerRegistry, PlatformLanding, settings-nav |
| `IconServer` | `ServerStackIcon` | Landing, providerRegistry, settings-nav |
| `IconTopologyStarRing3` | `NeuralNetworkIcon` | Landing |
| `IconVectorTriangle` | `Triangle01Icon` | Landing |
| `IconApi` | `ApiIcon` | Landing |
| `IconSparkles` | `SparklesIcon` | Landing, TopCommandBar |
| `IconShieldCheck` | `Shield01Icon` | Landing |
| `IconEye` | `ViewIcon` | Landing, LoginSplit, RegisterSplit, SettingsAccount |
| `IconEyeOff` | `ViewOffIcon` | LoginSplit, RegisterSplit, SettingsAccount |
| `IconPencil` | `PencilEdit01Icon` | Landing |
| `IconArrowDown` | `ArrowDown01Icon` | Landing |
| `IconPlayerPlay` | `PlayIcon` | Landing, DltLoadPanel, DltPullPanel, ParseEasyPanel |
| `IconMenu2` | `Menu02Icon` | TopCommandBar |
| `IconList` | `LeftToRightListBulletIcon` | TopCommandBar |
| `IconInfoCircle` | `InformationCircleIcon` | AgentConfigModal |
| `IconAlertCircle` | `AlertCircleIcon` | ErrorAlert |
| `IconPlugConnected` | `Plug01Icon` | DltPullPanel, ProviderCredentials, ApiKeyPanel |
| `IconDownload` | `Download04Icon` | PreviewTabPanel, DocxPreview, PptxPreview |
| `IconLock` | `LockIcon` | FlowDetail |
| `IconCopy` | `Copy01Icon` | ApiPlayground, FunctionRef, settings |
| `IconDeviceFloppy` | `FloppyDiskIcon` | ApiPlayground, ProviderCredentials |
| `IconClock` | `Clock01Icon` | FlowsList |
| `IconExternalLink` | `Link01Icon` | FlowsList |
| `IconTrash` | `Delete02Icon` | RunDetail, SettingsModelRoles |
| `IconPlayerStop` | `StopIcon` | RunDetail |
| `IconCloud` | `CloudIcon` | providerRegistry, ModelRegistrationPreview |
| `IconCpu` | `CpuIcon` | ModelRegistrationPreview |
| `IconUser` | `UserIcon` | ModelRegistrationPreview |
| `IconGripVertical` | `Drag01Icon` | SettingsModelRoles |
| `IconAdjustments` | `Settings02Icon` | settings-nav |
| `IconNetwork` | `NeuralNetworkIcon` | settings-nav |
| `IconUserCircle` | `UserCircleIcon` | settings-nav |
| `IconPlug` | `PlugIcon` | settings-nav, nav-config |
| `IconTerminal2` | `ComputerTerminalIcon` | settings-nav |
| `IconFolderPlus` | `FolderAddIcon` | nav-config |
| `IconSchema` | `DatabaseIcon` | nav-config |
| `IconListDetails` | `LeftToRightListBulletIcon` | PlatformLanding |
| `IconRoute` | `Route01Icon` | PlatformLanding |

### Lucide → Hugeicons

| Lucide Icon | Hugeicons Equivalent | Used In |
|---|---|---|
| `FileIcon` | `FileIcon` | file-upload, ProjectParseUppyUploader |
| `UploadIcon` | `Upload04Icon` | file-upload, ProjectParseUppyUploader |
| `XIcon` / `X` | `Cancel01Icon` | dialog, file-upload, sheet, ProjectParseUppyUploader |
| `AlertCircleIcon` | `AlertCircleIcon` | ProjectParseUppyUploader |
| `CheckIcon` | `Tick01Icon` | ProjectParseUppyUploader |
| `Loader2Icon` | `Loading03Icon` | ProjectParseUppyUploader |
| `CloudIcon` | `CloudIcon` | ProjectParseUppyUploader |
| `ChevronDownIcon` | `ArrowDown01Icon` | menu |
| `PanelLeft` | `PanelLeftIcon` | sidebar |

---

## Phase 1: Foundation

### Task 1: Redesign `AppIcon` for Hugeicons

The current `AppIcon` accepts a Tabler `Icon` component. Hugeicons uses a different API: a `HugeiconsIcon` wrapper that takes an `IconSvgElement` prop. Redesign `AppIcon` to use the Hugeicons API while preserving the semantic token system.

**Files:**
- Modify: `web/src/components/ui/app-icon.tsx`
- Modify: `web/src/lib/icon-contract.ts`

**Step 1: Write failing test for new AppIcon**

Create `web/src/components/ui/__tests__/app-icon.test.tsx`:

```tsx
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Home01Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../app-icon';

describe('AppIcon', () => {
  it('renders a Hugeicons icon with default props', () => {
    const { container } = render(<AppIcon icon={Home01Icon} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('applies tone class', () => {
    const { container } = render(<AppIcon icon={Home01Icon} tone="muted" />);
    const wrapper = container.firstElementChild;
    expect(wrapper?.className).toContain('text-muted-foreground');
  });

  it('applies custom className', () => {
    const { container } = render(<AppIcon icon={Home01Icon} className="rotate-90" />);
    const wrapper = container.firstElementChild;
    expect(wrapper?.className).toContain('rotate-90');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd web && npx vitest run src/components/ui/__tests__/app-icon.test.tsx
```

Expected: FAIL — current `AppIcon` accepts Tabler `Icon` type, not `IconSvgElement`.

**Step 3: Rewrite AppIcon**

Replace `web/src/components/ui/app-icon.tsx`:

```tsx
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import {
  ICON_CONTEXT_SIZE,
  ICON_SIZES,
  ICON_STANDARD,
  ICON_STROKES,
  type IconContextToken,
  type IconSizeToken,
  type IconStrokeToken,
  type IconToneToken,
} from '@/lib/icon-contract';
import { ICON_TONE_CLASS } from '@/lib/icon-contract';
import { cn } from '@/lib/utils';

type AppIconProps = {
  icon: IconSvgElement;
  size?: IconSizeToken;
  context?: IconContextToken;
  stroke?: IconStrokeToken;
  tone?: IconToneToken;
  className?: string;
};

export type { AppIconProps };

export function AppIcon({
  icon,
  size,
  context = ICON_STANDARD.defaultContext,
  stroke = 'regular',
  tone = 'current',
  className,
}: AppIconProps) {
  const resolvedSize = size ?? ICON_CONTEXT_SIZE[context];

  return (
    <HugeiconsIcon
      icon={icon}
      size={ICON_SIZES[resolvedSize]}
      strokeWidth={ICON_STROKES[stroke]}
      className={cn(ICON_TONE_CLASS[tone], className)}
      aria-hidden
    />
  );
}
```

**Step 4: Update icon-contract.ts**

Remove the `migrationStatus` field and update the note:

```ts
export const ICON_STANDARD = {
  defaultContext: 'content',
  defaultSize: 'md',
  note: 'Use AppIcon with Hugeicons IconSvgElement only. No raw HugeiconsIcon usage.',
  utilityTopRight: {
    context: 'utility',
    stroke: 'regular',
    tone: 'muted',
    buttonClass:
      'inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
  },
} as const;
```

**Step 5: Run test to verify it passes**

```bash
cd web && npx vitest run src/components/ui/__tests__/app-icon.test.tsx
```

Expected: PASS

**Step 6: Commit**

```bash
git add web/src/components/ui/app-icon.tsx web/src/lib/icon-contract.ts web/src/components/ui/__tests__/app-icon.test.tsx
git commit -m "feat: redesign AppIcon to use Hugeicons API"
```

---

### Task 2: Update ToolbarButton to use AppIcon internally

**Files:**
- Modify: `web/src/components/ui/toolbar-button.tsx`

**Step 1: Rewrite ToolbarButton to delegate to AppIcon**

```tsx
import type { IconSvgElement } from '@hugeicons/react';
import { AppIcon } from '@/components/ui/app-icon';
import {
  TOOLBAR_BUTTON_BASE,
  TOOLBAR_BUTTON_STATES,
  TOOLBAR_BUTTON,
} from '@/lib/toolbar-contract';
import type { IconContextToken } from '@/lib/icon-contract';
import { cn } from '@/lib/utils';

type ToolbarButtonProps = {
  icon?: IconSvgElement;
  label?: string;
  active?: boolean;
  onClick?: () => void;
  className?: string;
  'aria-label'?: string;
};

export function ToolbarButton({
  icon,
  label,
  active = false,
  onClick,
  className,
  'aria-label': ariaLabel,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={ariaLabel ?? label}
      onClick={onClick}
      className={cn(
        TOOLBAR_BUTTON_BASE,
        active ? TOOLBAR_BUTTON_STATES.active : TOOLBAR_BUTTON_STATES.inactive,
        className,
      )}
    >
      {icon && (
        <AppIcon
          icon={icon}
          context={TOOLBAR_BUTTON.iconContext as IconContextToken}
        />
      )}
      {label && <span>{label}</span>}
    </button>
  );
}
```

**Step 2: Verify build**

```bash
cd web && npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add web/src/components/ui/toolbar-button.tsx
git commit -m "refactor: ToolbarButton delegates to AppIcon"
```

---

### Task 3: Delete legacy iconTokens.ts

The `iconTokens.ts` file defines a parallel token system. All its contexts are covered by `icon-contract.ts`.

**Files:**
- Delete: `web/src/lib/iconTokens.ts`
- Check: any file importing from `iconTokens.ts`

**Step 1: Search for imports**

```bash
cd web && grep -r "iconTokens" src/ --include="*.ts" --include="*.tsx"
```

If any files import it, migrate them to use `icon-contract.ts` tokens before deleting.

**Step 2: Delete the file**

```bash
rm web/src/lib/iconTokens.ts
```

**Step 3: Verify build**

```bash
cd web && npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add -u
git commit -m "chore: remove legacy iconTokens.ts"
```

---

### Task 4: Migrate nav config files

Nav configs store icon references as data — they're the foundation other components render from. Migrate these first so downstream components can follow.

**Files:**
- Modify: `web/src/components/shell/nav-config.ts`
- Modify: `web/src/pages/settings/settings-nav.ts`

**Step 1: Migrate nav-config.ts**

Replace Tabler imports:

```ts
// BEFORE
import { IconCode, IconDatabase, IconPlug, IconFolderPlus, IconSchema } from '@tabler/icons-react';

// AFTER
import { CodeIcon, DatabaseIcon, PlugIcon, FolderAddIcon } from '@hugeicons/core-free-icons';
import type { IconSvgElement } from '@hugeicons/react';
```

Update the type of the `icon` field from `Icon` (Tabler) to `IconSvgElement` (Hugeicons).

Update each reference:
- `IconCode` → `CodeIcon`
- `IconDatabase` → `DatabaseIcon`
- `IconPlug` → `PlugIcon`
- `IconFolderPlus` → `FolderAddIcon`
- `IconSchema` → `DatabaseIcon` (closest match — schema is a database concept)

**Step 2: Migrate settings-nav.ts**

```ts
// BEFORE
import { IconAdjustments, IconBrain, IconNetwork, IconUserCircle, IconServer, IconPlug, IconTable, IconTerminal2 } from '@tabler/icons-react';

// AFTER
import { Settings02Icon, AiBrain01Icon, NeuralNetworkIcon, UserCircleIcon, ServerStackIcon, PlugIcon, GridTableIcon, ComputerTerminalIcon } from '@hugeicons/core-free-icons';
import type { IconSvgElement } from '@hugeicons/react';
```

Update each reference and the `icon` type field.

**Step 3: Update components that render these nav icons**

Check which components consume the nav config and render the icons. They likely use `<IconComponent size={…} />` (Tabler pattern) and need to switch to `<AppIcon icon={iconRef} context="nav" />`.

**Step 4: Verify build**

```bash
cd web && npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add web/src/components/shell/nav-config.ts web/src/pages/settings/settings-nav.ts
git commit -m "feat: migrate nav configs to Hugeicons"
```

---

### Task 5: Migrate UI primitives (dialog, sheet, menu, native-select, sidebar, file-upload)

These are shared components used everywhere. Migrating them removes Lucide entirely.

**Files:**
- Modify: `web/src/components/ui/dialog.tsx`
- Modify: `web/src/components/ui/sheet.tsx`
- Modify: `web/src/components/ui/menu.tsx`
- Modify: `web/src/components/ui/native-select.tsx`
- Modify: `web/src/components/ui/sidebar.tsx`
- Modify: `web/src/components/ui/file-upload.tsx`

**Step 1: Migrate each file**

For each file, replace the Lucide/Tabler import with Hugeicons + AppIcon:

| File | Old Import | New Import |
|------|-----------|------------|
| `dialog.tsx` | `XIcon` from lucide | `Cancel01Icon` + `AppIcon` |
| `sheet.tsx` | `X` from lucide | `Cancel01Icon` + `AppIcon` |
| `menu.tsx` | `ChevronDownIcon` from lucide | `ArrowDown01Icon` + `AppIcon` |
| `native-select.tsx` | `IconChevronDown` from tabler | `ArrowDown01Icon` + `AppIcon` |
| `sidebar.tsx` | `PanelLeft` from lucide | `PanelLeftIcon` + `AppIcon` |
| `file-upload.tsx` | `FileIcon, UploadIcon, XIcon` from lucide | `FileIcon, Upload04Icon, Cancel01Icon` + `AppIcon` |

Replace inline icon rendering (`<XIcon className="h-4 w-4" />`) with `<AppIcon icon={Cancel01Icon} context="inline" />`.

**Step 2: Verify build**

```bash
cd web && npx tsc --noEmit
```

**Step 3: Visual check**

Run `npm run dev` and verify dialog close buttons, sheet close, menu arrows, and file upload render correctly.

**Step 4: Commit**

```bash
git add web/src/components/ui/dialog.tsx web/src/components/ui/sheet.tsx web/src/components/ui/menu.tsx web/src/components/ui/native-select.tsx web/src/components/ui/sidebar.tsx web/src/components/ui/file-upload.tsx
git commit -m "feat: migrate UI primitives from Lucide/Tabler to Hugeicons"
```

---

### Task 6: Migrate TopCommandBar and LeftRailShadcn (shell)

The shell is visible on every page — migrating it gives immediate visual consistency.

**Files:**
- Modify: `web/src/components/shell/TopCommandBar.tsx`
- Modify: `web/src/components/shell/LeftRailShadcn.tsx`

**Step 1: Migrate TopCommandBar**

Replace:
```ts
import { IconMenu2, IconSparkles, IconList } from '@tabler/icons-react';
import { Moon02Icon, Sun03Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
```

With:
```ts
import { Menu02Icon, SparklesIcon, LeftToRightListBulletIcon, Moon02Icon, Sun03Icon } from '@hugeicons/core-free-icons';
```

Replace all `<AppIcon icon={IconMenu2} … />` with `<AppIcon icon={Menu02Icon} … />`.
Replace raw `<HugeiconsIcon icon={Moon02Icon} … />` with `<AppIcon icon={Moon02Icon} … />`.

**Step 2: Migrate LeftRailShadcn**

Replace:
```ts
import { IconCheck, IconChevronDown, IconLayoutColumns, IconPlus } from '@tabler/icons-react';
```

With:
```ts
import { Tick01Icon, ArrowDown01Icon, Layout03Icon, Add01Icon } from '@hugeicons/core-free-icons';
```

Update all JSX references.

**Step 3: Verify build + visual check**

```bash
cd web && npx tsc --noEmit && npm run dev
```

Check: sidebar renders, top bar icons display, theme toggle works.

**Step 4: Commit**

```bash
git add web/src/components/shell/TopCommandBar.tsx web/src/components/shell/LeftRailShadcn.tsx
git commit -m "feat: migrate shell components to Hugeicons"
```

---

## Phase 2: Systematic Page Migration (future sessions)

Each task below is one file or one tightly coupled group. Follow the same pattern: update imports → update JSX → type-check → visual verify → commit.

### Task 7: Migrate auth pages
- `web/src/pages/LoginSplit.tsx` — IconEye/IconEyeOff → ViewIcon/ViewOffIcon
- `web/src/pages/RegisterSplit.tsx` — same
- `web/src/pages/settings/SettingsAccount.tsx` — same

### Task 8: Migrate Landing page
- `web/src/pages/Landing.tsx` — 23 Tabler icons → Hugeicons (use mapping table above)
- Largest single file migration — do carefully

### Task 9: Migrate settings pages
- `web/src/pages/settings/ApiPlaygroundDetail.tsx`
- `web/src/pages/settings/ApiPlaygroundFunctionCard.tsx`
- `web/src/pages/settings/ServiceDetailRailView.tsx`
- `web/src/pages/settings/FunctionReferenceCard.tsx`
- `web/src/pages/settings/ServiceDetailPanel.tsx`
- `web/src/pages/settings/setting-card-shared.tsx`
- `web/src/pages/settings/SettingsAiOverview.tsx`
- `web/src/pages/settings/SettingsModelRoles.tsx`
- `web/src/pages/settings/SettingsProviderForm.tsx`

### Task 10: Migrate document previews
- `web/src/components/documents/DocxPreview.tsx`
- `web/src/components/documents/PptxPreview.tsx`
- `web/src/components/documents/PreviewTabPanel.tsx`
- `web/src/components/documents/PdfPreview.tsx` (already uses Hugeicons — wrap with AppIcon)
- `web/src/components/documents/ProjectParseUppyUploader.tsx` (Lucide → Hugeicons)

### Task 11: Migrate ELT / flow components
- `web/src/components/elt/DltLoadPanel.tsx`
- `web/src/components/elt/DltPullPanel.tsx`
- `web/src/components/elt/ParseEasyPanel.tsx`
- `web/src/pages/FlowDetail.tsx`
- `web/src/pages/FlowsList.tsx`
- `web/src/components/flows/FlowWorkbench.tsx`

### Task 12: Migrate remaining pages
- `web/src/pages/EarlyAccess.tsx`
- `web/src/pages/DatabasePlaceholder.tsx`
- `web/src/pages/RunDetail.tsx`
- `web/src/pages/ModelRegistrationPreview.tsx`
- `web/src/pages/Projects.tsx`
- `web/src/pages/Schemas.tsx`
- `web/src/pages/SchemaLayout.tsx`
- `web/src/pages/HowItWorks.tsx`
- `web/src/pages/UseCases.tsx`
- `web/src/pages/Landing.old.tsx`
- `web/src/pages/experiments/PlatformLanding.tsx`

### Task 13: Migrate agent components
- `web/src/components/agents/providerRegistry.tsx`
- `web/src/components/agents/AgentConfigModal.tsx`
- `web/src/components/agents/forms/ProviderCredentialsModule.tsx`
- `web/src/components/agents/forms/ApiKeyPanel.tsx`

### Task 14: Migrate remaining components
- `web/src/components/common/ErrorAlert.tsx`
- `web/src/components/marketing/BottomCTA.tsx`
- `web/src/components/marketing/IntegrationMap.tsx`
- `web/src/components/layout/AuthBrandPanel.tsx`
- `web/src/components/layout/PublicNavModern.tsx` (already Hugeicons — wrap with AppIcon)
- `web/src/components/kv/KVTable.tsx`
- `web/src/components/shell/AssistantDockHost.tsx`
- `web/src/pages/marketing/content.ts`

---

## Phase 3: Cleanup (after all migrations)

### Task 15: Remove Tabler and Lucide dependencies

**Step 1: Verify no imports remain**

```bash
cd web && grep -r "@tabler/icons-react" src/ --include="*.ts" --include="*.tsx"
cd web && grep -r "lucide-react" src/ --include="*.ts" --include="*.tsx"
```

Both must return empty.

**Step 2: Uninstall packages**

```bash
cd web && npm uninstall @tabler/icons-react lucide-react
```

**Step 3: Verify build**

```bash
cd web && npx tsc --noEmit && npm run build
```

**Step 4: Commit**

```bash
git add -u web/package.json web/package-lock.json
git commit -m "chore: remove Tabler and Lucide icon dependencies"
```

### Task 16: Update design system docs

Add icon specification to `docs/design-system.md`:

```markdown
## Icons

**Library:** Hugeicons (`@hugeicons/core-free-icons` + `@hugeicons/react`)

**Component:** Always use `<AppIcon icon={…} />`. Never use `<HugeiconsIcon>` directly.

**Sizes:**
| Token | px | Context |
|-------|-----|---------|
| xs | 14 | — |
| sm | 16 | inline |
| md | 20 | content, utility |
| lg | 24 | nav |
| xl | 28 | hero |
| xxl | 32 | — |

**Stroke weights:**
| Token | Value |
|-------|-------|
| light | 1.6 |
| regular | 1.8 (default) |
| strong | 2.1 |

**Tones:** current (inherit), default, muted, accent, success, warning, danger

**Rule:** Prefer `context` over explicit `size`. Pass `size` only for deliberate overrides.
```

---

## Migration Checklist Per File

For each file being migrated, follow this exact sequence:

1. Open the file, identify all icon imports
2. Look up each icon in the mapping table above
3. Replace the import statement (Tabler/Lucide → Hugeicons)
4. If rendering icons directly (`<IconName size={20} stroke={1.8} />`), replace with `<AppIcon icon={IconName} context="…" />`
5. If passing icons as props/data, update the type from `Icon` (Tabler) to `IconSvgElement` (Hugeicons)
6. Run `npx tsc --noEmit` to catch type errors
7. Visual check in browser if the component is renderable
8. Commit the file

---

## Notes for AI Sessions

- **One file at a time.** Don't batch multiple files into one edit — mistakes compound.
- **Visual verification matters.** Some Hugeicons may look different than their Tabler counterparts. Flag any icon that looks wrong for manual review.
- **Type safety is your friend.** The switch from `Icon` (Tabler component type) to `IconSvgElement` (Hugeicons element type) will cause type errors in every consuming file. This is expected and guides the migration.
- **The mapping table is a starting point.** Some icons may need different Hugeicons choices after visual comparison. Update the table when substitutions are made.
- **Don't forget data files.** `nav-config.ts`, `settings-nav.ts`, `providerRegistry.tsx`, and `marketing/content.ts` store icon references as data, not JSX. These need type changes too.
