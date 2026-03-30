import { useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { AGCHAIN_PROJECT_FOCUS_STORAGE_KEY } from '@/hooks/agchain/useAgchainProjectFocus';

export default function AgchainBenchmarkWorkbenchPage() {
  const { benchmarkId } = useParams<{ benchmarkId: string }>();
  const { hash } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (benchmarkId) {
      window.localStorage.setItem(AGCHAIN_PROJECT_FOCUS_STORAGE_KEY, benchmarkId);
    }

    navigate(`/app/agchain/settings/project/benchmark-definition${hash || ''}`, { replace: true });
  }, [benchmarkId, hash, navigate]);

  return (
    <div
      data-testid="agchain-benchmark-compat-redirect"
      className="flex min-h-full items-center justify-center bg-background px-6 py-12 text-sm text-muted-foreground"
    >
      Redirecting benchmark route into the AGChain project-focused shell...
    </div>
  );
}
