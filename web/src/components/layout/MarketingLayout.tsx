import { Box } from '@mantine/core';
import { Outlet } from 'react-router-dom';
import { PublicNavModern } from './PublicNavModern';

/** Full-width layout for landing page and future marketing pages. */
export function MarketingLayout() {
  return (
    <Box>
      <PublicNavModern />
      <Outlet />
    </Box>
  );
}
