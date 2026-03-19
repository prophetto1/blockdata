import { PageHeader } from '@/components/common/PageHeader';

export default function SecretsPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Secrets"
        subtitle="Manage sensitive values and credentials used across your workspace."
      />

      <section className="rounded-md border border-border bg-card p-5">
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">Secrets Placeholder</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            This surface is reserved for workspace secrets, credentials, and protected values.
          </p>
        </div>
      </section>
    </div>
  );
}
