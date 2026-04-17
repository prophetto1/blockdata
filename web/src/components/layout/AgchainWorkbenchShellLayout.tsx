import { useState, type CSSProperties } from 'react';
import { Outlet } from 'react-router-dom';
import { Drawer } from '@ark-ui/react/drawer';
import { IconLayoutSidebarLeftExpand } from '@tabler/icons-react';
import { AgchainWorkbenchRail } from '@/components/agchain/AgchainWorkbenchRail';
import { AgchainWorkspaceProvider } from '@/contexts/AgchainWorkspaceContext';
import { useIsMobile } from '@/hooks/use-mobile';

const AGCHAIN_WORKBENCH_RAIL_WIDTH = 248;

export function AgchainWorkbenchShellLayout() {
  return (
    <AgchainWorkspaceProvider>
      <AgchainWorkbenchShellInner />
    </AgchainWorkspaceProvider>
  );
}

function AgchainWorkbenchShellInner() {
  const isMobile = useIsMobile();
  const [navOpened, setNavOpened] = useState(false);

  const mainStyle: CSSProperties = {
    position: 'absolute',
    insetBlockStart: 0,
    insetBlockEnd: 0,
    insetInlineEnd: 0,
    insetInlineStart: isMobile ? 0 : `${AGCHAIN_WORKBENCH_RAIL_WIDTH}px`,
    overflow: 'auto',
    backgroundColor: 'var(--background)',
  };

  return (
    <div className="relative h-dvh overflow-hidden bg-background text-foreground">
      {!isMobile ? (
        <aside
          data-testid="agchain-workbench-rail"
          style={{
            position: 'fixed',
            insetInlineStart: 0,
            insetBlock: 0,
            width: `${AGCHAIN_WORKBENCH_RAIL_WIDTH}px`,
            borderInlineEnd: '1px solid var(--border)',
            backgroundColor: 'var(--chrome, var(--background))',
            zIndex: 20,
          }}
        >
          <AgchainWorkbenchRail />
        </aside>
      ) : (
        <>
          <button
            type="button"
            aria-label="Open workbench navigation"
            onClick={() => setNavOpened(true)}
            className="fixed left-3 top-3 z-[140] inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-[var(--chrome,var(--background))] text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <IconLayoutSidebarLeftExpand size={16} stroke={1.75} />
          </button>

          <Drawer.Root
            open={navOpened}
            onOpenChange={(details) => {
              if (!details.open) setNavOpened(false);
            }}
          >
            <Drawer.Backdrop className="fixed inset-0 z-[120] bg-black/45 transition-opacity duration-150" />
            <Drawer.Positioner
              style={{
                position: 'fixed',
                insetBlockStart: 0,
                insetBlockEnd: 0,
                insetInlineStart: 0,
                width: `${AGCHAIN_WORKBENCH_RAIL_WIDTH}px`,
                zIndex: 130,
              }}
            >
              <Drawer.Content
                data-testid="agchain-workbench-rail"
                style={{
                  height: '100%',
                  borderInlineEnd: '1px solid var(--border)',
                  backgroundColor: 'var(--chrome, var(--background))',
                }}
              >
                <AgchainWorkbenchRail />
              </Drawer.Content>
            </Drawer.Positioner>
          </Drawer.Root>
        </>
      )}

      <main data-testid="agchain-workbench-frame" style={mainStyle}>
        <div className="h-full min-h-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
