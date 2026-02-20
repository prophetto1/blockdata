import type { ReactNode } from 'react';
import { Box, Container, useComputedColorScheme, type BoxProps } from '@mantine/core';
import { marketingHeroGradient, styleTokens } from '@/lib/styleTokens';

type MarketingHeroShellProps = {
  children: ReactNode;
  x: string;
  y: string;
  lightAlpha?: number;
  darkAlpha?: number;
  fadeStop?: number;
  pt?: BoxProps['pt'];
  pb?: BoxProps['pb'];
};

export function MarketingHeroShell({
  children,
  x,
  y,
  lightAlpha,
  darkAlpha,
  fadeStop,
  pt,
  pb,
}: MarketingHeroShellProps) {
  const isDark = useComputedColorScheme('dark') === 'dark';

  return (
    <Box
      pt={pt ?? styleTokens.marketing.heroPaddingTop}
      pb={pb ?? styleTokens.marketing.heroPaddingBottom}
      className="marketing-hero-shell"
      style={{
        background: marketingHeroGradient({
          isDark,
          x,
          y,
          lightAlpha,
          darkAlpha,
          fadeStop,
        }),
      }}
    >
      <Container px={styleTokens.marketing.sectionPaddingX} className="marketing-hero-shell-inner">
        {children}
      </Container>
    </Box>
  );
}
