import KestraPageShell from './KestraPageShell';

export default function ExecutionsPage() {
  return (
    <KestraPageShell
      title="Executions"
      subtitle="Review flow execution history across the workspace."
      searchPlaceholder="Search executions"
      columns={[
        'Id',
        'Start date',
        'End date',
        'Duration',
        'Namespace',
        'Flow',
        'Labels',
        'State',
        'Triggers',
        'Actions',
      ]}
      emptyTitle="No executions found."
      emptyDescription="Execution history will appear here after flows are wired to the runtime bridge."
    />
  );
}
