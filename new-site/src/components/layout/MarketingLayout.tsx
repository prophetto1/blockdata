import { Outlet } from 'react-router-dom';
import PublicNav from './PublicNav';
import PublicFooter from './PublicFooter';

export default function MarketingLayout() {
  return (
    <>
      <PublicNav />
      <Outlet />
      <PublicFooter />
    </>
  );
}
