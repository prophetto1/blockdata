import { RadioGroup } from '@ark-ui/react/radio-group';
import {
  IconDeviceDesktop,
  IconCloudUpload,
  IconDatabase,
  IconBrandGoogleDrive,
  IconBrandDropbox,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';

export type UploadSource = 'local' | 'cloud' | 'database';

interface UploadSourceCardsProps {
  value: UploadSource;
  onValueChange: (value: UploadSource) => void;
}

const SOURCES: {
  value: UploadSource;
  label: string;
  description: string;
  icon: React.ReactNode;
  badges?: { icon: React.ReactNode; label: string }[];
}[] = [
  {
    value: 'local',
    label: 'Local Files',
    description: 'Upload from your computer',
    icon: <IconDeviceDesktop size={24} strokeWidth={1.5} />,
  },
  {
    value: 'cloud',
    label: 'Cloud Storage',
    description: 'Import from connected services',
    icon: <IconCloudUpload size={24} strokeWidth={1.5} />,
    badges: [
      { icon: <IconBrandGoogleDrive size={14} />, label: 'Google Drive' },
      { icon: <IconBrandDropbox size={14} />, label: 'Dropbox' },
    ],
  },
  {
    value: 'database',
    label: 'Database',
    description: 'Connect to a data source',
    icon: <IconDatabase size={24} strokeWidth={1.5} />,
  },
];

export function UploadSourceCards({ value, onValueChange }: UploadSourceCardsProps) {
  return (
    <RadioGroup.Root
      value={value}
      onValueChange={(details) => onValueChange(details.value as UploadSource)}
      className="flex flex-col gap-2"
    >
      {SOURCES.map((source) => (
        <RadioGroup.Item
          key={source.value}
          value={source.value}
          className={cn(
            'group flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors',
            'hover:border-primary/40 hover:bg-primary/5',
            'data-[state=checked]:border-primary data-[state=checked]:bg-primary/5',
          )}
        >
          <RadioGroup.ItemControl
            className={cn(
              'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-border',
              'data-[state=checked]:border-[5px] data-[state=checked]:border-primary',
            )}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground group-data-[state=checked]:text-primary">
                {source.icon}
              </span>
              <RadioGroup.ItemText className="text-sm font-medium text-foreground">
                {source.label}
              </RadioGroup.ItemText>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {source.description}
            </p>
            {source.badges && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {source.badges.map((badge) => (
                  <span
                    key={badge.label}
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                  >
                    {badge.icon}
                    {badge.label}
                  </span>
                ))}
              </div>
            )}
          </div>
          <RadioGroup.ItemHiddenInput />
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  );
}
