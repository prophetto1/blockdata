import { Outlet } from 'react-router-dom';
import { AdminLeftNav } from '@/components/admin/AdminLeftNav';

export function AdminShellLayout() {
  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background">
      <AdminLeftNav />
      <main className="relative flex-1 min-w-0 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
