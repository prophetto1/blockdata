import { Outlet, ScrollRestoration } from 'react-router-dom';
import { PublicNavModern } from './PublicNavModern';
import { PublicFooter } from './PublicFooter';

export function PublicFullBleedLayout() {
  return (
    <div>
      <ScrollRestoration />
      <PublicNavModern />
      <div className="flex min-h-screen flex-col pt-14">
        <div className="flex flex-1">
          <Outlet />
        </div>
        <PublicFooter />
      </div>
    </div>
  );
}
