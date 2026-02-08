import { Center, Container } from '@mantine/core';
import { Outlet } from 'react-router-dom';

export function PublicLayout() {
  return (
    <Center mih="100vh">
      <Container size="xs" w="100%">
        <Outlet />
      </Container>
    </Center>
  );
}
