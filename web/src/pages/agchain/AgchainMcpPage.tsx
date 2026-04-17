import { AgchainProjectPlaceholderPage } from '@/components/agchain/AgchainProjectPlaceholderPage';

export default function AgchainMcpPage() {
  return (
    <AgchainProjectPlaceholderPage
      title="MCP"
      description="Harness MCP servers, tool exposure policy, and integration bindings will live here."
      bullets={[
        'MCP configuration in the harness lane should stay scoped to project authoring rather than generic app settings alone.',
        'This route will eventually manage attached servers, exposed capabilities, and trust boundaries for harness execution.',
        'The placeholder keeps that harness slot stable while the MCP authoring model is still evolving.',
      ]}
    />
  );
}
