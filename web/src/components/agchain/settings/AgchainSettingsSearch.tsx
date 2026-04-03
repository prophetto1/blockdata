import { IconSearch } from '@tabler/icons-react';

type AgchainSettingsSearchProps = {
  value: string;
  onChange: (value: string) => void;
};

export function AgchainSettingsSearch({ value, onChange }: AgchainSettingsSearchProps) {
  return (
    <label className="relative block">
      <IconSearch
        size={14}
        stroke={1.75}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search settings"
        aria-label="Search settings"
        className="h-9 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}
