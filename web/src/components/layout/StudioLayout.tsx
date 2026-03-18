import { Outlet } from 'react-router-dom';
import { StudioLeftNav } from '@/components/studio/StudioLeftNav';
import { styleTokens } from '@/lib/styleTokens';

export function StudioLayout() {
  return (
    <div
      className="flex h-dvh w-full overflow-hidden"
      style={{ backgroundColor: styleTokens.studio.background }}
    >
      <StudioLeftNav />
      <main className="relative flex-1 min-w-0 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
