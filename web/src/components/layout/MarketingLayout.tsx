import { Outlet } from 'react-router-dom';
import { PublicNavModern } from './PublicNavModern';
import { PublicFooter } from './PublicFooter';

/** Full-width layout for landing page and future marketing pages. */
export function MarketingLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicNavModern />
      <div className="flex-1">
        <Outlet />
      </div>
      <PublicFooter />
    </div>
  );
}
