import { WorkbenchPage } from '@/components/common/WorkbenchPage';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';

type SuperuserControlTowerPlaceholderPageProps = {
  title: string;
  summary: string;
  futureScope?: string[];
  testId: string;
  textOnly?: boolean;
  blank?: boolean;
};

export function SuperuserControlTowerPlaceholderPage({
  title,
  summary,
  futureScope,
  testId,
  textOnly = false,
  blank = false,
}: SuperuserControlTowerPlaceholderPageProps) {
  useShellHeaderTitle({
    title,
    breadcrumbs: ['Superuser', title],
  });

  return (
    <WorkbenchPage
      title={title}
      hideHeader
      contentClassName="gap-4 bg-background"
    >
      <section
        data-testid={testId}
        className="max-w-3xl rounded-2xl border border-border/70 bg-card px-4 py-4 shadow-sm"
      >
        {blank ? null : textOnly ? (
          <p className="text-sm leading-6 text-muted-foreground">{summary}</p>
        ) : (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Control Tower placeholder
            </p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              This control tower surface is reserved for upcoming implementation work.
            </p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{summary}</p>
            {!!futureScope?.length && (
              <div className="mt-4">
                <h2 className="text-sm font-semibold tracking-tight text-foreground">Planned focus</h2>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {futureScope.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </section>
    </WorkbenchPage>
  );
}
