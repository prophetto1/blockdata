import { FileUpload as ArkFileUpload } from '@ark-ui/react/file-upload';
import { FileIcon, UploadIcon, XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FileUploadProps
  extends Omit<ArkFileUpload.RootProps, 'children'> {
  label?: string;
  description?: string;
  children?: React.ReactNode;
}

export function FileUpload({
  label,
  description,
  className,
  maxFiles = 10,
  ...props
}: FileUploadProps) {
  return (
    <ArkFileUpload.Root
      maxFiles={maxFiles}
      className={cn('flex w-full flex-col gap-4', className)}
      {...props}
    >
      {label && (
        <ArkFileUpload.Label className="text-sm font-medium text-foreground data-[disabled]:opacity-50">
          {label}
        </ArkFileUpload.Label>
      )}
      <ArkFileUpload.Dropzone
        className={cn(
          'flex min-h-40 flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border p-6 text-center',
          'cursor-pointer transition-colors duration-150',
          'hover:bg-muted/50',
          'data-[dragging]:border-primary data-[dragging]:border-solid data-[dragging]:bg-primary/5',
          'data-[invalid]:border-destructive',
          'data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        )}
      >
        <UploadIcon className="h-10 w-10 text-muted-foreground" />
        <div className="flex flex-col items-center gap-1">
          <span className="text-sm font-medium text-foreground">
            Drag and drop files here
          </span>
          <span className="text-xs text-muted-foreground">
            {description ?? 'or click to browse'}
          </span>
        </div>
      </ArkFileUpload.Dropzone>
      <ArkFileUpload.ItemGroup className="flex flex-col gap-3">
        <ArkFileUpload.Context>
          {({ acceptedFiles }) =>
            acceptedFiles.map((file) => (
              <ArkFileUpload.Item
                key={file.name}
                file={file}
                className={cn(
                  'grid grid-cols-[auto_1fr_auto] items-center gap-x-3 rounded-lg border border-border bg-card p-3',
                  'data-[rejected]:border-destructive data-[rejected]:bg-destructive/5',
                )}
              >
                <ArkFileUpload.ItemPreview
                  type="image/*"
                  className="flex items-center justify-center"
                >
                  <ArkFileUpload.ItemPreviewImage className="h-10 w-10 rounded object-cover" />
                </ArkFileUpload.ItemPreview>
                <ArkFileUpload.ItemPreview
                  type=".*"
                  className="flex items-center justify-center"
                >
                  <FileIcon className="h-5 w-5 text-muted-foreground" />
                </ArkFileUpload.ItemPreview>
                <div className="min-w-0">
                  <ArkFileUpload.ItemName className="truncate text-sm font-medium text-foreground" />
                  <ArkFileUpload.ItemSizeText className="text-xs text-muted-foreground" />
                </div>
                <ArkFileUpload.ItemDeleteTrigger
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded bg-transparent text-muted-foreground',
                    'cursor-pointer border-none hover:text-foreground',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  )}
                >
                  <XIcon className="h-4 w-4" />
                </ArkFileUpload.ItemDeleteTrigger>
              </ArkFileUpload.Item>
            ))
          }
        </ArkFileUpload.Context>
      </ArkFileUpload.ItemGroup>
      <ArkFileUpload.HiddenInput />
    </ArkFileUpload.Root>
  );
}
