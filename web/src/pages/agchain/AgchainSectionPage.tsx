import {
  AgchainProjectPlaceholderPage,
  type AgchainProjectPlaceholderPageProps,
} from '@/components/agchain/AgchainProjectPlaceholderPage';

type AgchainSectionPageProps = AgchainProjectPlaceholderPageProps;

export function AgchainSectionPage({
  statusLabel = 'Deprecated compatibility surface',
  ...props
}: AgchainSectionPageProps) {
  return (
    <AgchainProjectPlaceholderPage
      statusLabel={statusLabel}
      {...props}
    />
  );
}
