import { Box } from '@mantine/core';
import { Outlet } from 'react-router-dom';
import { PublicNav } from './PublicNav';

export function PublicFullBleedLayout() {
  return (
    <Box>
      <PublicNav />
      <Outlet />
    </Box>
  );
}

