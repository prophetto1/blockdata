import { AgchainWorkspaceProvider } from '@/contexts/AgchainWorkspaceContext';
import AgchainToolsPage from '@/pages/agchain/AgchainToolsPage';

export default function AgchainAdminToolsPage() {
  return (
    <AgchainWorkspaceProvider>
      <AgchainToolsPage />
    </AgchainWorkspaceProvider>
  );
}

