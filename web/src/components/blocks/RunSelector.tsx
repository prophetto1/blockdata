import { Select } from '@mantine/core';
import type { RunWithSchema } from '@/lib/types';

type Props = {
  runs: RunWithSchema[];
  value: string | null;
  onChange: (value: string | null) => void;
};

export function RunSelector({ runs, value, onChange }: Props) {
  const data = [
    { value: '', label: 'No run (blocks only)' },
    ...runs.map((r) => ({
      value: r.run_id,
      label: `${r.schemas?.schema_ref ?? 'unknown'} - ${r.status} (${r.completed_blocks}/${r.total_blocks})`,
    })),
  ];

  return (
    <Select
      placeholder="Select a run to view overlays"
      data={data}
      value={value ?? ''}
      onChange={(v) => onChange(v || null)}
      searchable
      maw={450}
    />
  );
}
