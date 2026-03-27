import { AgchainSectionPage } from './AgchainSectionPage';

export default function AgchainSettingsPage() {
  return (
    <AgchainSectionPage
      title="Settings"
      description="Runtime defaults, retention, package registration, and platform-level AG chain controls belong here."
      bullets={[
        'Context delivery policies and tool-provision defaults will need explicit platform controls.',
        'Storage and retention settings for runs and artifacts should be managed here.',
        'This surface should hold AG chain-specific settings, not generic admin-only configuration.',
      ]}
    />
  );
}
