type FlowEmptyStateProps = {
  title: string;
  subtitle?: string;
};

export function FlowEmptyState({ title, subtitle }: FlowEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-6">
        <div className="w-12 h-12 rounded-lg bg-primary/30" />
      </div>
      <h3 className="text-base font-semibold text-foreground text-center">{title}</h3>
      {subtitle && (
        <p className="mt-2 text-sm text-muted-foreground text-center max-w-md">{subtitle}</p>
      )}
    </div>
  );
}
