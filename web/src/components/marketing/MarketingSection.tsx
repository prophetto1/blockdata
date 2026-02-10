import type { ReactNode } from 'react';
import { Box, Container, type BoxProps, type ContainerProps } from '@mantine/core';

type Props = BoxProps & {
  children?: ReactNode;
  containerSize?: ContainerProps['size'];
  inner?: BoxProps;
};

export function MarketingSection({
  children,
  containerSize = 'lg',
  py = 72,
  inner,
  ...boxProps
}: Props) {
  return (
    <Box py={py} {...boxProps}>
      <Container size={containerSize}>
        <Box {...inner}>
          {children}
        </Box>
      </Container>
    </Box>
  );
}
