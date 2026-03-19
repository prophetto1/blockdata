import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';

export function Component() {
  useShellHeaderTitle({ title: 'Skills', breadcrumbs: ['Build AI / Agents', 'Skills'] });

  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="max-w-lg text-center">
        <h1 className="text-2xl font-semibold text-foreground">Skills</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Define reusable skills that agents can use to perform tasks.
        </p>
      </div>
    </div>
  );
}
