import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { useAgentConfigs } from '@/components/agents/useAgentConfigs';
import { onboardingNextPath } from '@/components/agents/onboarding/constants';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function AgentOnboardingSelect() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedFromQuery = searchParams.get('selected');
  const { data, loading, error } = useAgentConfigs();
  const [selectedSlug, setSelectedSlug] = useState<string | null>(selectedFromQuery);

  useEffect(() => {
    setSelectedSlug(selectedFromQuery);
  }, [selectedFromQuery]);

  useEffect(() => {
    if (!loading && data && data.default_agent_slug && data.readiness?.[data.default_agent_slug]?.is_ready) {
      navigate('/app/agents', { replace: true });
    }
  }, [loading, data, navigate]);

  const catalog = useMemo(() => data?.catalog ?? [], [data?.catalog]);

  if (loading) {
    return (
      <>
        <PageHeader title="Agent onboarding" subtitle="Step 1 of 3: Select your default agent." />
        <div className="flex items-center justify-center py-10">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-foreground" />
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader title="Agent onboarding" subtitle="Step 1 of 3: Select your default agent." />
        <p className="text-sm text-destructive">{error}</p>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Agent onboarding" subtitle="Step 1 of 3: Select your default agent." />
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {catalog.map((cat) => {
            const readiness = data?.readiness?.[cat.agent_slug];
            const configured = Boolean(readiness?.is_ready);
            const isSelected = selectedSlug === cat.agent_slug;
            return (
              <article
                key={cat.agent_slug}
                className={cn(
                  'rounded-lg border border-border bg-card p-6 transition-shadow',
                  isSelected && 'ring-2 ring-ring',
                )}
              >
                <div className="space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <p className="text-base font-semibold text-foreground">{cat.display_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {cat.provider_family}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {isSelected && (
                        <span className="inline-flex items-center rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                          Selected
                        </span>
                      )}
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                          configured
                            ? 'bg-emerald-500/15 text-emerald-500'
                            : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {configured ? 'Configured' : 'Needs setup'}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant={isSelected ? 'default' : 'outline'}
                    onClick={() => {
                      setSelectedSlug(cat.agent_slug);
                      navigate(onboardingNextPath(cat.agent_slug, cat.provider_family));
                    }}
                  >
                    Select
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </>
  );
}
