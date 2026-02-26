import type { ReactNode } from 'react';
import { marketingHeroGradient } from '@/lib/styleTokens';
import { useIsDark } from '@/lib/useIsDark';

type ResponsiveNumber = number | { base: number; md?: number };

type MarketingHeroShellProps = {
  children: ReactNode;
  x: string;
  y: string;
  lightAlpha?: number;
  darkAlpha?: number;
  fadeStop?: number;
  pt?: ResponsiveNumber;
  pb?: ResponsiveNumber;
};

function resolveNumber(value: ResponsiveNumber | undefined): number | undefined {
  if (value == null) return undefined;
  if (typeof value === 'number') return value;
  return value.base;
}

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
  const isDark = useIsDark();
  const ptPx = resolveNumber(pt);
  const pbPx = resolveNumber(pb);
  const defaultClasses = pt == null && pb == null ? 'pt-28 pb-16 md:pt-36 md:pb-24' : '';

  return (
    <div
      className={`marketing-hero-shell ${defaultClasses}`}
      style={{
        ...(ptPx != null ? { paddingTop: ptPx } : {}),
        ...(pbPx != null ? { paddingBottom: pbPx } : {}),
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
      <div className="marketing-hero-shell-inner mx-auto px-4 sm:px-6 md:px-8">
        {children}
      </div>
    </div>
  );
}
