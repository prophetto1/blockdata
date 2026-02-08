import { Alert } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';

export function ErrorAlert({ message }: { message: string }) {
  return (
    <Alert color="red" icon={<IconAlertCircle size={18} />} mt="md">
      {message}
    </Alert>
  );
}
