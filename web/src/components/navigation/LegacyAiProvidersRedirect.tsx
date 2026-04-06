import { Navigate, useParams } from 'react-router-dom';
import { blockdataAiProviderPath, blockdataAiProvidersPath } from '@/lib/aiProviderRoutes';

export function LegacyAiProvidersRedirect() {
  const { providerId } = useParams<{ providerId?: string }>();

  return (
    <Navigate
      to={providerId ? blockdataAiProviderPath(providerId) : blockdataAiProvidersPath()}
      replace
    />
  );
}
