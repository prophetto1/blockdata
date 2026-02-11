import { Box } from '@mantine/core';
import { Outlet } from 'react-router-dom';
import { PublicNavModern } from './PublicNavModern';
import { PublicFooter } from './PublicFooter';

/** Full-width layout for landing page and future marketing pages. */
export function MarketingLayout() {
  return (
    <Box style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <PublicNavModern />
      <Box style={{ flex: 1 }}>
        <Outlet />
      </Box>
      <PublicFooter />
    </Box>
  );
}
