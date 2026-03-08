import { NocodeCard } from './NocodeCard';

type Props = {
  disabled: boolean | undefined;
  onChange: (value: boolean | undefined) => void;
};

export function DisabledSection({ disabled, onChange }: Props) {
  return (
    <NocodeCard name="disabled" typeBadge="Boolean">
      <button
        type="button"
        role="switch"
        aria-checked={disabled ?? false}
        onClick={() => onChange(disabled ? undefined : true)}
        className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        style={{ backgroundColor: disabled ? 'var(--primary)' : 'var(--muted)' }}
      >
        <span
          className="inline-block h-4 w-4 rounded-full bg-white transition-transform"
          style={{ transform: disabled ? 'translateX(22px)' : 'translateX(4px)' }}
        />
      </button>
    </NocodeCard>
  );
}
