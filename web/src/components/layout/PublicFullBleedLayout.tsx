import { Box } from '@mantine/core';
import { Outlet } from 'react-router-dom';
import { PublicNav } from './PublicNav';

export function PublicFullBleedLayout() {
  return (
    <Box>
      <PublicNav />
      <Box pt={80}>
        <Outlet />
      </Box>
    </Box>
  );
}
