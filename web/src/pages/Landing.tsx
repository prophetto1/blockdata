import { Title, Text, Button, Stack, Center } from '@mantine/core';
import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <Center mih="100vh">
      <Stack align="center" gap="lg">
        <Title order={1}>MD-Annotate</Title>
        <Text size="lg" c="dimmed" maw={480} ta="center">
          Upload documents. Define schemas. Annotate blocks with AI. Review results interactively.
        </Text>
        <Button size="lg" onClick={() => navigate('/login')}>
          Get started
        </Button>
      </Stack>
    </Center>
  );
}
