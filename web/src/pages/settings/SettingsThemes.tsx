import { SettingsPageFrame, SettingsSection } from './SettingsPageHeader';

export default function SettingsThemes() {
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
          <p className="text-sm text-muted-foreground">
            Theme configuration is coming soon. Use the sun/moon toggle in the top bar for now.
          </p>
        </SettingsSection>
      </div>
    </SettingsPageFrame>
  );
}
