import { Outlet, ScrollRestoration } from 'react-router-dom';
import { PublicNav } from './PublicNav';
import { PublicFooter } from './PublicFooter';

export function PublicFullBleedLayout() {
  return (
    <div>
      <ScrollRestoration />
      <PublicNav />
      <div className="flex min-h-[calc(100vh-80px)] flex-col pt-20">
        <div className="flex flex-1">
          <Outlet />
        </div>
        <PublicFooter />
      </div>
    </div>
  );
}
