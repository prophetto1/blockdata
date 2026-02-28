import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import {
  TOOLBAR_BUTTON_BASE,
  TOOLBAR_BUTTON_STATES,
  TOOLBAR_BUTTON,
} from '@/lib/toolbar-contract';
import { ICON_SIZES, ICON_CONTEXT_SIZE } from '@/lib/icon-contract';
import { cn } from '@/lib/utils';

type ToolbarButtonProps = {
  icon?: IconSvgElement;
  label?: string;
  active?: boolean;
  onClick?: () => void;
  className?: string;
  'aria-label'?: string;
};

export function ToolbarButton({
  icon,
  label,
  active = false,
  onClick,
  className,
  'aria-label': ariaLabel,
}: ToolbarButtonProps) {
  const iconSize = ICON_SIZES[ICON_CONTEXT_SIZE[TOOLBAR_BUTTON.iconContext]];

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={ariaLabel ?? label}
      onClick={onClick}
      className={cn(
        TOOLBAR_BUTTON_BASE,
        active ? TOOLBAR_BUTTON_STATES.active : TOOLBAR_BUTTON_STATES.inactive,
        className,
      )}
    >
      {icon && <HugeiconsIcon icon={icon} size={iconSize} strokeWidth={1.8} />}
      {label && <span>{label}</span>}
    </button>
  );
}