import KestraPageShell from './KestraPageShell';

export default function LogsPage() {
  return (
    <KestraPageShell
      title="Logs"
      subtitle="Inspect runtime log lines across flows and executions."
      searchPlaceholder="Search logs"
      columns={['Timestamp', 'Level', 'Namespace', 'Flow', 'Task', 'Message']}
      emptyTitle="No logs found."
      emptyDescription="Logs will appear here once executions start writing runtime events."
    />
  );
}
