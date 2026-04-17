import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

type PlatformOption = {
  label: string;
  value: 'blockdata' | 'agchain';
  path: string;
};

const PLATFORM_OPTIONS: PlatformOption[] = [
  { label: 'Blockdata', value: 'blockdata', path: '/app' },
  { label: 'AG chain', value: 'agchain', path: '/app/agchain' },
];

function getCurrentPlatform(pathname: string): PlatformOption['value'] {
  return pathname.startsWith('/app/agchain') ? 'agchain' : 'blockdata';
}

export function ShellPlatformToggle() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPlatform = getCurrentPlatform(location.pathname);

  return (
    <div
      role="group"
      aria-label="Platform"
      className="grid grid-cols-2 gap-1 rounded-[10px] border border-border/70 bg-card/20 p-1"
    >
      {PLATFORM_OPTIONS.map((option) => {
        const isActive = option.value === currentPlatform;

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => {
              if (!isActive) navigate(option.path);
            }}
            className={cn(
              'inline-flex h-9 items-center justify-center rounded-[8px] px-3 text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors active:scale-95',
              isActive
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-background/60 hover:text-foreground',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
