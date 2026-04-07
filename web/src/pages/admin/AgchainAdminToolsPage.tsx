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
      bodyClassName="p-0"
    >
      <div className="flex min-h-[400px] items-center justify-center text-sm text-muted-foreground">
        This page is being rebuilt.
      </div>
    </SettingsPageFrame>
  );
}
