import { Outlet, ScrollRestoration } from 'react-router-dom';
import { PublicFooter } from './PublicFooter';

export function PublicLayout() {
  return (
    <div>
      <ScrollRestoration />
      <div className="flex min-h-screen flex-col">
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm px-4">
            <Outlet />
          </div>
        </div>
        <PublicFooter />
      </div>
    </div>
  );
}
