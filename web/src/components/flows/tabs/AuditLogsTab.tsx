import { Badge } from '@/components/ui/badge';

export function AuditLogsTab() {
  return (
    <div className="rounded-md border border-border bg-card p-6">
      <div className="flex flex-col items-center text-center">
        <Badge variant="secondary" size="sm" className="mb-4">
          Enterprise Edition
        </Badge>
        <h3 className="text-lg font-semibold text-foreground">Track Changes with Audit Logs</h3>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Audit logs record every activity with robust, immutable records, making it easy to track changes, maintain compliance, and troubleshoot issues.
        </p>
      </div>
    </div>
  );
}
