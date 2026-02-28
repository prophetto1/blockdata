import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconCheck,
  IconKey,
  IconX,
} from '@tabler/icons-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/lib/tables';
import type { UserApiKeyRow } from '@/lib/types';
import { PROVIDERS } from './SettingsProviderForm';

const USER_KEY_COLUMNS =
  'id, user_id, provider, key_suffix, is_valid, default_model, default_temperature, default_max_tokens, base_url, created_at, updated_at';

export default function SettingsAiOverview() {
  const navigate = useNavigate();
  const [keyMap, setKeyMap] = useState<Record<string, UserApiKeyRow | null>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from(TABLES.userApiKeys)
      .select(USER_KEY_COLUMNS)
      .then(({ data }) => {
        const map: Record<string, UserApiKeyRow | null> = {};
        for (const p of PROVIDERS) map[p.id] = null;
        if (data) {
          for (const row of data as UserApiKeyRow[]) {
            map[row.provider] = row;
          }
        }
        setKeyMap(map);
        setLoading(false);
      });
  }, []);

  if (loading) return null;

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-base font-semibold text-foreground">AI Providers</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure API keys and model defaults for each provider.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {PROVIDERS.map((provider) => {
          const row = keyMap[provider.id] ?? null;
          const connected = row?.is_valid === true;
          const invalid = row?.is_valid === false;
          const hasKey = row != null;

          return (
            <button
              key={provider.id}
              type="button"
              className={cn(
                'flex items-start gap-3 rounded-lg border border-border bg-card p-4 text-left transition-colors',
                'hover:border-primary/40 hover:bg-accent',
              )}
              onClick={() => navigate(`/app/settings/ai/${provider.id}`)}
            >
              <div
                className={cn(
                  'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border',
                  hasKey ? 'border-border bg-muted text-foreground' : 'border-border bg-muted text-muted-foreground',
                )}
              >
                {provider.icon}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-foreground">{provider.label}</span>
                  {hasKey && (
                    <Badge variant="gray" size="sm" className="inline-flex items-center gap-1">
                      {connected ? (
                        <IconCheck size={12} />
                      ) : invalid ? (
                        <IconX size={12} />
                      ) : (
                        <IconKey size={12} />
                      )}
                      {connected ? 'Connected' : invalid ? 'Invalid' : `....${row.key_suffix}`}
                    </Badge>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{provider.description}</p>
                {row?.default_model && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Model: {row.default_model}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}