import { Box, Center, Container } from '@mantine/core';
import { Outlet } from 'react-router-dom';
import { PublicNav } from './PublicNav';
import { PublicFooter } from './PublicFooter';

export function PublicLayout() {
  return (
    <Box>
      <PublicNav />
      <Box pt={80} style={{ minHeight: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}>
        <Center style={{ flex: 1 }}>
          <Container size="xs" w="100%">
            <Outlet />
          </Container>
        </Center>
        <PublicFooter />
      </Box>
    </Box>
  );
}
