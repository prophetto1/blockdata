import { styleTokens } from '@/lib/styleTokens';

type Props = {
  section: string;
  color: string;
};

export function StudioSectionPlaceholder({ section, color }: Props) {
  return (
    <div
      className="flex h-full flex-col items-center justify-center gap-3"
      style={{ backgroundColor: styleTokens.studio.background }}
    >
      <p
        className="font-mono text-[10px] tracking-widest"
        style={{ color: 'var(--muted-foreground)', opacity: 0.4 }}
      >
        // COMING SOON
      </p>
      <h2
        className="font-mono text-lg font-semibold tracking-widest"
        style={{ color, textTransform: 'uppercase' }}
      >
        {section}
      </h2>
      <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
        This section is under construction.
      </p>
    </div>
  );
}
