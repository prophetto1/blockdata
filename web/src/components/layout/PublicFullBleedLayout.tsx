import { Box } from '@mantine/core';
import { Outlet } from 'react-router-dom';
import { PublicNav } from './PublicNav';
import { PublicFooter } from './PublicFooter';

export function PublicFullBleedLayout() {
  return (
    <Box>
      <PublicNav />
      <Box pt={80} style={{ minHeight: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}>
        <Box style={{ flex: 1, display: 'flex' }}>
          <Outlet />
        </Box>
        <PublicFooter />
      </Box>
    </Box>
  );
}
