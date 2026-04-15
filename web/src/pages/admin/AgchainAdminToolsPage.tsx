import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { SettingsPageFrame } from '@/pages/settings/SettingsPageHeader';

export default function AgchainAdminToolsPage() {
  useShellHeaderTitle({
    title: 'AGChain Admin Tools',
    breadcrumbs: ['AGChain Admin', 'Tools'],
  });

  return (
    <SettingsPageFrame
      title="Tools"
      description="Tool registry — being rebuilt."
      headerVariant="admin"
      bodyClassName="p-4"
    >
      <section className="flex min-h-[360px] items-center justify-center rounded-3xl border border-dashed border-border/70 bg-card/60 px-6 py-10 text-center shadow-sm">
        <div className="max-w-md space-y-2">
          <h2 className="text-sm font-semibold text-foreground">Tool registry is being rebuilt</h2>
          <p className="text-sm text-muted-foreground">
            This surface is still being reassembled around the newer AG Chain tool contract.
          </p>
        </div>
      </section>
    </SettingsPageFrame>
  );
}
