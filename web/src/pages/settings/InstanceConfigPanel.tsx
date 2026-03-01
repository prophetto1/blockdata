import { useState, useMemo } from 'react';
import { Field } from '@ark-ui/react/field';
import { NumberInput } from '@ark-ui/react/number-input';
import { PasswordInput } from '@ark-ui/react/password-input';
import { Select, createListCollection } from '@ark-ui/react/select';
import { Switch } from '@ark-ui/react/switch';
import {
  IconCheck,
  IconChevronDown,
  IconEye,
  IconEyeOff,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type FieldType = 'text' | 'number' | 'boolean' | 'select' | 'password' | 'textarea';

type SettingDef = {
  key: string;
  label: string;
  description: string;
  fieldType: FieldType;
  defaultValue: unknown;
  placeholder?: string;
  selectItems?: string[];
};

type SectionDef = {
  id: string;
  label: string;
  settings: SettingDef[];
};

/* ------------------------------------------------------------------ */
/*  Shared input class (matches SettingsAdmin pattern)                 */
/* ------------------------------------------------------------------ */

const inputClass =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

/* ------------------------------------------------------------------ */
/*  Static section definitions (mirrors Windmill's instanceSettings)   */
/* ------------------------------------------------------------------ */

const SECTIONS: SectionDef[] = [
  {
    id: 'platform',
    label: 'Platform',
    settings: [
      {
        key: 'platform.base_url',
        label: 'Base URL',
        description: 'Public Supabase project URL used by edge functions and the frontend.',
        fieldType: 'text',
        defaultValue: 'https://dbdzzhshmigewyprahej.supabase.co',
        placeholder: 'https://your-project.supabase.co',
      },
      {
        key: 'platform.pipeline_worker_url',
        label: 'Pipeline Worker URL',
        description: 'Base URL of the pipeline-worker FastAPI service for task execution.',
        fieldType: 'text',
        defaultValue: 'http://192.168.0.168:8000',
        placeholder: 'http://host:port',
      },
      {
        key: 'platform.kestra_url',
        label: 'Kestra URL',
        description: 'Kestra instance URL for catalog sync and delegated execution.',
        fieldType: 'text',
        defaultValue: 'http://localhost:8080',
        placeholder: 'http://host:port',
      },
      {
        key: 'platform.request_size_limit_mb',
        label: 'Request size limit (MB)',
        description: 'Maximum HTTP request body size accepted by edge functions.',
        fieldType: 'number',
        defaultValue: 50,
        placeholder: '50',
      },
    ],
  },
  {
    id: 'jobs',
    label: 'Jobs',
    settings: [
      {
        key: 'jobs.default_timeout',
        label: 'Default task timeout (seconds)',
        description: 'Timeout applied to individual task runs unless overridden.',
        fieldType: 'number',
        defaultValue: 300,
        placeholder: '300',
      },
      {
        key: 'jobs.max_execution_timeout',
        label: 'Max execution timeout (seconds)',
        description: 'Hard ceiling on total execution duration including all tasks.',
        fieldType: 'number',
        defaultValue: 900,
        placeholder: '900',
      },
      {
        key: 'jobs.isolation_mode',
        label: 'Isolation mode',
        description: 'How task scripts are sandboxed during execution.',
        fieldType: 'select',
        defaultValue: 'subprocess',
        selectItems: ['none', 'subprocess', 'container'],
      },
      {
        key: 'jobs.keep_job_dirs',
        label: 'Keep job directories for debug',
        description: 'Retain temporary task directories after execution completes.',
        fieldType: 'boolean',
        defaultValue: false,
      },
      {
        key: 'jobs.retention_period_days',
        label: 'Retention period (days)',
        description: 'How long to keep execution history and logs in the database.',
        fieldType: 'number',
        defaultValue: 30,
        placeholder: '30',
      },
    ],
  },
  {
    id: 'workers',
    label: 'Workers',
    settings: [
      {
        key: 'workers.concurrency',
        label: 'Concurrency limit',
        description: 'Maximum number of tasks a single worker can execute in parallel.',
        fieldType: 'number',
        defaultValue: 3,
        placeholder: '3',
      },
      {
        key: 'workers.group',
        label: 'Worker group',
        description: 'Worker group assignment for task routing.',
        fieldType: 'select',
        defaultValue: 'default',
        selectItems: ['default', 'native', 'heavy'],
      },
      {
        key: 'workers.auto_register_plugins',
        label: 'Auto-register plugins on startup',
        description: 'Automatically sync plugin registry from worker /plugins endpoint on boot.',
        fieldType: 'boolean',
        defaultValue: true,
      },
    ],
  },
  {
    id: 'registries',
    label: 'Registries',
    settings: [
      {
        key: 'registries.python_version',
        label: 'Python version',
        description: 'Default Python version for script-type task execution.',
        fieldType: 'select',
        defaultValue: '3.12',
        selectItems: ['3.10', '3.11', '3.12', '3.13'],
      },
      {
        key: 'registries.pip_index_url',
        label: 'Pip index URL',
        description: 'Private PyPI registry URL for Python dependency resolution.',
        fieldType: 'password',
        defaultValue: '',
        placeholder: 'https://username:password@pypi.company.com/simple',
      },
      {
        key: 'registries.npmrc',
        label: 'NPM registry (.npmrc)',
        description: 'Full .npmrc content for private npm registries. Used by TypeScript/Node tasks.',
        fieldType: 'textarea',
        defaultValue: '',
        placeholder: 'registry=https://registry.mycompany.com/\n//registry.mycompany.com/:_authToken=TOKEN',
      },
    ],
  },
  {
    id: 'alerts',
    label: 'Alerts',
    settings: [
      {
        key: 'alerts.slack_webhook_url',
        label: 'Slack webhook URL',
        description: 'Incoming webhook URL for critical alert delivery to Slack.',
        fieldType: 'password',
        defaultValue: '',
        placeholder: 'https://hooks.slack.com/services/...',
      },
      {
        key: 'alerts.smtp_host',
        label: 'Email SMTP host',
        description: 'SMTP server for sending email alerts and notifications.',
        fieldType: 'text',
        defaultValue: '',
        placeholder: 'smtp.gmail.com',
      },
      {
        key: 'alerts.on_execution_failure',
        label: 'Alert on execution failure',
        description: 'Send an alert whenever a pipeline execution transitions to FAILED.',
        fieldType: 'boolean',
        defaultValue: true,
      },
    ],
  },
  {
    id: 'observability',
    label: 'Observability',
    settings: [
      {
        key: 'observability.otel_endpoint',
        label: 'OpenTelemetry endpoint',
        description: 'OTEL collector URL for distributed tracing of task executions.',
        fieldType: 'text',
        defaultValue: '',
        placeholder: 'http://localhost:4318',
      },
      {
        key: 'observability.prometheus_enabled',
        label: 'Prometheus metrics enabled',
        description: 'Expose /metrics endpoint for Prometheus scraping.',
        fieldType: 'boolean',
        defaultValue: false,
      },
      {
        key: 'observability.log_retention_days',
        label: 'Log retention (days)',
        description: 'How long to retain execution logs before automatic cleanup.',
        fieldType: 'number',
        defaultValue: 7,
        placeholder: '7',
      },
    ],
  },
  {
    id: 'secret-storage',
    label: 'Secret Storage',
    settings: [
      {
        key: 'secret_storage.backend',
        label: 'Backend',
        description: 'Where secrets and credentials are stored. Supabase Vault encrypts at rest in the database.',
        fieldType: 'select',
        defaultValue: 'supabase-vault',
        selectItems: ['supabase-vault', 'env'],
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Setting card component                                             */
/* ------------------------------------------------------------------ */

function SettingCard({
  setting,
  value,
  onChange,
}: {
  setting: SettingDef;
  value: unknown;
  onChange: (key: string, val: unknown) => void;
}) {
  const selectCollection = useMemo(() => {
    if (setting.fieldType !== 'select' || !setting.selectItems) return null;
    return createListCollection({
      items: setting.selectItems.map((item) => ({ label: item, value: item })),
    });
  }, [setting.fieldType, setting.selectItems]);

  const renderInput = () => {
    switch (setting.fieldType) {
      case 'text':
        return (
          <Field.Root>
            <Field.Input
              className={inputClass}
              value={(value as string) ?? ''}
              onChange={(e) => onChange(setting.key, e.currentTarget.value)}
              placeholder={setting.placeholder}
            />
          </Field.Root>
        );

      case 'number':
        return (
          <NumberInput.Root
            value={String(typeof value === 'number' ? value : 0)}
            min={0}
            max={Number.MAX_SAFE_INTEGER}
            step={1}
            formatOptions={{ maximumFractionDigits: 0 }}
            onValueChange={(details) => {
              if (Number.isFinite(details.valueAsNumber)) {
                onChange(setting.key, Math.trunc(details.valueAsNumber));
              }
            }}
            className="w-full"
          >
            <NumberInput.Control className="relative">
              <NumberInput.Input className={`${inputClass} pr-16`} placeholder={setting.placeholder} />
              <div className="absolute inset-y-0 right-1 flex items-center gap-1">
                <NumberInput.DecrementTrigger className="h-8 w-6 rounded border border-input text-muted-foreground hover:bg-accent hover:text-accent-foreground">
                  -
                </NumberInput.DecrementTrigger>
                <NumberInput.IncrementTrigger className="h-8 w-6 rounded border border-input text-muted-foreground hover:bg-accent hover:text-accent-foreground">
                  +
                </NumberInput.IncrementTrigger>
              </div>
            </NumberInput.Control>
          </NumberInput.Root>
        );

      case 'password':
        return (
          <PasswordInput.Root>
            <PasswordInput.Control className="relative flex items-center">
              <PasswordInput.Input
                className={cn(inputClass, 'pr-10')}
                placeholder={setting.placeholder}
                value={(value as string) ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(setting.key, e.currentTarget.value)}
              />
              <PasswordInput.VisibilityTrigger className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground">
                <PasswordInput.Indicator fallback={<IconEyeOff size={16} />}>
                  <IconEye size={16} />
                </PasswordInput.Indicator>
              </PasswordInput.VisibilityTrigger>
            </PasswordInput.Control>
          </PasswordInput.Root>
        );

      case 'boolean':
        return (
          <Switch.Root
            checked={Boolean(value)}
            onCheckedChange={(details) => onChange(setting.key, details.checked)}
            className="inline-flex items-center gap-2"
          >
            <Switch.HiddenInput />
            <Switch.Control className="relative h-6 w-11 rounded-full border border-input bg-muted transition-colors data-[state=checked]:border-primary data-[state=checked]:bg-primary">
              <Switch.Thumb className="block h-5 w-5 translate-x-0 rounded-full bg-background shadow transition-transform data-[state=checked]:translate-x-5" />
            </Switch.Control>
            <Switch.Label className="text-sm text-foreground">
              {value ? 'Enabled' : 'Disabled'}
            </Switch.Label>
          </Switch.Root>
        );

      case 'select':
        if (!selectCollection) return null;
        return (
          <Select.Root
            collection={selectCollection}
            value={value ? [String(value)] : []}
            onValueChange={(details) => {
              const next = details.value[0];
              if (next) onChange(setting.key, next);
            }}
            positioning={{
              placement: 'bottom-start',
              sameWidth: true,
              offset: { mainAxis: 6 },
              strategy: 'fixed',
            }}
          >
            <Select.Control className="relative">
              <Select.Trigger className={cn(inputClass, 'flex items-center justify-between')}>
                <Select.ValueText className="truncate text-left" placeholder="Select..." />
                <Select.Indicator className="ml-2 shrink-0 text-muted-foreground">
                  <IconChevronDown size={16} />
                </Select.Indicator>
              </Select.Trigger>
            </Select.Control>
            <Select.Positioner className="z-50">
              <Select.Content className="max-h-64 overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-md">
                {selectCollection.items.map((item) => (
                  <Select.Item
                    key={item.value}
                    item={item}
                    className={cn(
                      'flex cursor-pointer items-center justify-between rounded-md px-2.5 py-2 text-sm text-popover-foreground',
                      'data-[state=checked]:bg-accent data-[state=checked]:font-medium',
                      'data-highlighted:bg-accent data-highlighted:outline-none',
                    )}
                  >
                    <Select.ItemText>{item.label}</Select.ItemText>
                    <Select.ItemIndicator>
                      <IconCheck size={14} />
                    </Select.ItemIndicator>
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Positioner>
            <Select.HiddenSelect />
          </Select.Root>
        );

      case 'textarea':
        return (
          <Field.Root>
            <Field.Textarea
              value={(value as string) ?? ''}
              onChange={(e) => onChange(setting.key, e.currentTarget.value)}
              placeholder={setting.placeholder}
              rows={4}
              className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </Field.Root>
        );

      default:
        return null;
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className={cn(
        'flex gap-4',
        setting.fieldType === 'textarea' ? 'flex-col' : 'items-start justify-between',
      )}>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-medium">{setting.label}</h4>
          <p className="mt-0.5 text-xs text-muted-foreground">{setting.description}</p>
        </div>
        <div className={cn(
          'shrink-0',
          setting.fieldType === 'boolean' ? '' : setting.fieldType === 'textarea' ? 'w-full' : 'w-64',
        )}>
          {renderInput()}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main panel                                                         */
/* ------------------------------------------------------------------ */

export function InstanceConfigPanel() {
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id);
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const initial: Record<string, unknown> = {};
    for (const section of SECTIONS) {
      for (const setting of section.settings) {
        initial[setting.key] = setting.defaultValue;
      }
    }
    return initial;
  });

  const handleChange = (key: string, val: unknown) => {
    setValues((prev) => ({ ...prev, [key]: val }));
  };

  const currentSection = SECTIONS.find((s) => s.id === activeSection) ?? SECTIONS[0];

  return (
    <div className="flex h-full gap-0 overflow-hidden">
      {/* Section sidebar */}
      <nav className="w-44 shrink-0 overflow-y-auto border-r border-border pr-2">
        <ul className="space-y-0.5 py-1">
          {SECTIONS.map((section) => (
            <li key={section.id}>
              <button
                type="button"
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  'flex w-full items-center rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors',
                  section.id === activeSection
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                )}
              >
                {section.label}
              </button>
            </li>
          ))}
        </ul>

        {/* Sample-only indicator */}
        <div className="mt-6 rounded-md border border-dashed border-amber-500/40 bg-amber-500/5 px-2.5 py-2">
          <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400">Sample only</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            Settings are interactive but not persisted. Design reference for future wiring.
          </p>
        </div>
      </nav>

      {/* Settings content */}
      <div className="min-w-0 flex-1 overflow-y-auto pl-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">{currentSection.label}</h2>
          <p className="text-xs text-muted-foreground">
            {currentSection.settings.length} setting{currentSection.settings.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="space-y-3 pb-6">
          {currentSection.settings.map((setting) => (
            <SettingCard
              key={setting.key}
              setting={setting}
              value={values[setting.key]}
              onChange={handleChange}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
