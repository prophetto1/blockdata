import { Box, Center, Container } from '@mantine/core';
import { Outlet } from 'react-router-dom';
import { PublicNav } from './PublicNav';

export function PublicLayout() {
  return (
    <Box>
      <PublicNav />
      <Box pt={80}>
        <Center mih="calc(100vh - 80px)">
          <Container size="xs" w="100%">
            <Outlet />
          </Container>
        </Center>
      </Box>
    </Box>
  );
}
