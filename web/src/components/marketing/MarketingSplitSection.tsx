import type { ReactNode } from 'react';
import { Grid, GridCol, Stack, type GridProps } from '@mantine/core';

type Props = GridProps & {
  leftSlot: ReactNode;
  rightSlot: ReactNode;
};

export function MarketingSplitSection({ leftSlot, rightSlot, gutter = 48, ...props }: Props) {
  return (
    <Grid gutter={gutter} align="center" {...props}>
      <GridCol span={{ base: 12, md: 7 }}>
        <Stack gap="lg">
          {leftSlot}
        </Stack>
      </GridCol>
      <GridCol span={{ base: 12, md: 5 }}>
        {rightSlot}
      </GridCol>
    </Grid>
  );
}
