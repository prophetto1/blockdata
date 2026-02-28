import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconCheck,
  IconKey,
  IconX,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/lib/tables';
import type { UserApiKeyRow } from '@/lib/types';
import { PROVIDERS } from './SettingsProviderForm';
import { SettingsPageFrame } from './SettingsPageHeader';

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
    <SettingsPageFrame
      title="AI Providers"
      description="Configure API keys and model defaults for each provider."
    >
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
                'group relative flex items-start gap-3 rounded-lg border bg-card p-4 text-left shadow-sm transition-all',
                connected
                  ? 'border-green-300/60 dark:border-green-700/40'
                  : invalid
                    ? 'border-red-300/60 dark:border-red-700/40'
                    : 'border-border',
                'hover:shadow-md hover:border-primary/40',
              )}
              onClick={() => navigate(`/app/settings/ai/${provider.id}`)}
            >
              <div
                className={cn(
                  'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                  connected
                    ? 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400'
                    : invalid
                      ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400'
                      : 'bg-muted text-muted-foreground',
                )}
              >
                {provider.icon}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-foreground">{provider.label}</span>
                  {connected && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400">
                      <IconCheck size={12} />
                      Connected
                    </span>
                  )}
                  {invalid && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
                      <IconX size={12} />
                      Invalid
                    </span>
                  )}
                  {hasKey && !connected && !invalid && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <IconKey size={12} />
                      ....{row.key_suffix}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{provider.description}</p>
                {row?.default_model && (
                  <p className="mt-1.5 truncate rounded bg-muted/60 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                    {row.default_model}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </SettingsPageFrame>
  );
}
