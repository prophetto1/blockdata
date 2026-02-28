import type { Icon } from '@tabler/icons-react';
import {
  ICON_CONTEXT_SIZE,
  ICON_SIZES,
  ICON_STANDARD,
  ICON_STROKES,
  ICON_TONE_CLASS,
  type IconContextToken,
  type IconSizeToken,
  type IconStrokeToken,
  type IconToneToken,
} from '@/lib/icon-contract';
import { cn } from '@/lib/utils';

type AppIconProps = {
  icon: Icon;
  size?: IconSizeToken;
  context?: IconContextToken;
  stroke?: IconStrokeToken;
  tone?: IconToneToken;
  className?: string;
};

export function AppIcon({
  icon: IconComponent,
  size,
  context = ICON_STANDARD.defaultContext,
  stroke = 'regular',
  tone = 'current',
  className,
}: AppIconProps) {
  const resolvedSize = size ?? ICON_CONTEXT_SIZE[context];

  return (
    <IconComponent
      size={ICON_SIZES[resolvedSize]}
      stroke={ICON_STROKES[stroke]}
      className={cn(ICON_TONE_CLASS[tone], className)}
      aria-hidden
    />
  );
}
