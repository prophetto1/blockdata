import { Box } from '@mantine/core';
import { Outlet } from 'react-router-dom';
import { PublicNav } from './PublicNav';

/** Full-width layout for landing page and future marketing pages. */
export function MarketingLayout() {
  return (
    <Box>
      <PublicNav />
      <Outlet />
    </Box>
  );
}
