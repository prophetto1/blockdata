import { Outlet } from 'react-router-dom';

export default function SettingsLayout() {
  return (
    <div className="flex h-[calc(100vh-var(--app-shell-header-height))] overflow-hidden">
      <section className="min-w-0 flex-1 overflow-hidden p-6">
        <div className="h-full min-h-0 overflow-hidden">
          <Outlet />
        </div>
      </section>
    </div>
  );
}
