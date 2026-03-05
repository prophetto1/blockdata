import { SettingsPageFrame, SettingsSection } from './SettingsPageHeader';
import { useTheme, type ThemeChoice } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

const CHOICES: { value: ThemeChoice; label: string; description: string }[] = [
  { value: 'light', label: 'Light', description: 'Always use light mode.' },
  { value: 'dark', label: 'Dark', description: 'Always use dark mode.' },
  { value: 'system', label: 'System', description: 'Follow your operating system preference.' },
];

export default function SettingsThemes() {
  const { choice, setTheme } = useTheme();

  return (
    <SettingsPageFrame
      title="Themes"
      description="Customize the appearance of your workspace."
    >
      <div className="space-y-6">
        <SettingsSection
          title="Color mode"
          description="Choose between light and dark mode, or follow your system preference."
        >
          <div className="grid gap-2 sm:grid-cols-3">
            {CHOICES.map(({ value, label, description }) => (
              <button
                key={value}
                type="button"
                onClick={() => setTheme(value)}
                className={cn(
                  'flex flex-col items-start gap-1 rounded-md border px-4 py-3 text-left text-sm transition-colors',
                  choice === value
                    ? 'border-primary bg-primary/5 text-foreground'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/50 hover:bg-accent/30',
                )}
              >
                <span className="font-medium text-foreground">{label}</span>
                <span className="text-xs">{description}</span>
              </button>
            ))}
          </div>
        </SettingsSection>
      </div>
    </SettingsPageFrame>
  );
}
