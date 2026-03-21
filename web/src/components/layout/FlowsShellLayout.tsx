import { Outlet } from 'react-router-dom';
import { FlowsDetailRail } from '@/components/flows/FlowsDetailRail';

const FLOWS_RAIL_WIDTH = 224;

export function FlowsShellLayout() {
  return (
    <div className="relative h-dvh overflow-hidden bg-background text-foreground">
      <aside
        style={{
          position: 'fixed',
          insetInlineStart: 0,
          insetBlock: 0,
          width: `${FLOWS_RAIL_WIDTH}px`,
          borderInlineEnd: '1px solid var(--border)',
          zIndex: 20,
        }}
      >
        <FlowsDetailRail />
      </aside>

      <main
        role="main"
        style={{
          position: 'absolute',
          insetBlock: 0,
          insetInlineEnd: 0,
          insetInlineStart: `${FLOWS_RAIL_WIDTH}px`,
          overflow: 'hidden',
          backgroundColor: 'var(--background)',
        }}
      >
        <div data-testid="flows-shell-frame" className="h-full min-h-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
