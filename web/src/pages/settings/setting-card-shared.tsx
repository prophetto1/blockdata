import { useMemo } from 'react';
import { Field } from '@ark-ui/react/field';
import { NumberInput } from '@ark-ui/react/number-input';
import { PasswordInput } from '@ark-ui/react/password-input';
import { Select, createListCollection } from '@ark-ui/react/select';
import { Switch } from '@ark-ui/react/switch';
import { Tick01Icon, ArrowDown01Icon, ViewIcon, ViewOffIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type FieldType = 'text' | 'number' | 'boolean' | 'select' | 'password' | 'textarea';

export type SettingDef = {
  key: string;
  label: string;
  description: string;
  fieldType: FieldType;
  defaultValue: unknown;
  placeholder?: string;
  selectItems?: string[];
};

export type SectionDef = {
  id: string;
  label: string;
  settings: SettingDef[];
};

export type PolicyRow = {
  policy_key: string;
  value: unknown;
  value_type: string;
  description: string | null;
  updated_at: string;
  updated_by: string | null;
};

/* ------------------------------------------------------------------ */
/*  Shared input class                                                 */
/* ------------------------------------------------------------------ */

export const inputClass =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

/* ------------------------------------------------------------------ */
/*  Setting card component                                             */
/* ------------------------------------------------------------------ */

export function SettingCard({
  setting,
  value,
  onChange,
  dirty,
  saving,
  onSave,
}: {
  setting: SettingDef;
  value: unknown;
  onChange: (key: string, val: unknown) => void;
  dirty: boolean;
  saving: boolean;
  onSave: (key: string) => void;
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
                <PasswordInput.Indicator fallback={<HugeiconsIcon icon={ViewOffIcon} size={16} strokeWidth={1.8} />}>
                  <HugeiconsIcon icon={ViewIcon} size={16} strokeWidth={1.8} />
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
                  <HugeiconsIcon icon={ArrowDown01Icon} size={16} strokeWidth={1.8} />
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
                      <HugeiconsIcon icon={Tick01Icon} size={14} strokeWidth={1.8} />
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
    <div className={cn(
      'rounded-lg border bg-card p-4',
      dirty ? 'border-primary/40' : 'border-border',
    )}>
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
      {dirty && (
        <div className="mt-2 flex justify-end">
          <Button
            size="sm"
            className="h-7 px-3 text-xs"
            disabled={saving}
            onClick={() => onSave(setting.key)}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      )}
    </div>
  );
}
