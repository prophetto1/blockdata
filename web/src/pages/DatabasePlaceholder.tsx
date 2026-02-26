import { IconDatabase } from '@tabler/icons-react';
import { PageHeader } from '@/components/common/PageHeader';

export default function DatabasePlaceholder() {
  return (
    <>
      <PageHeader title="Database" />
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-muted-foreground">
        <IconDatabase size={48} strokeWidth={1.2} />
        <p className="text-sm">Database browser coming soon.</p>
      </div>
    </>
  );
}
