import type { FlowDocumentHandle } from './useFlowDocument';
import { FlowPropertiesSection } from './sections/FlowPropertiesSection';
import { LabelsSection } from './sections/LabelsSection';
import { InputsSection } from './sections/InputsSection';
import { TasksSection } from './sections/TasksSection';
import { ArraySection } from './sections/ArraySection';
import { ConcurrencySection } from './sections/ConcurrencySection';
import { DisabledSection } from './sections/DisabledSection';
import { RetrySection } from './sections/RetrySection';
import { VariablesSection } from './sections/VariablesSection';
import { WorkerGroupSection } from './sections/WorkerGroupSection';
import { IconAlertTriangle } from '@tabler/icons-react';
import { ScrollArea } from '@/components/ui/scroll-area';

type Props = FlowDocumentHandle;

export function NocodeEditor({ doc, parseError, updateField, updateTask, addTask, removeTask, reorderTasks }: Props) {
  if (!doc) {
    return (
      <div className="p-4 space-y-2">
        <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2">
          <IconAlertTriangle size={16} className="shrink-0 text-destructive" />
          <span className="text-sm font-medium text-destructive">YAML syntax error</span>
        </div>
        {parseError && (
          <pre className="text-xs text-muted-foreground font-mono bg-muted/50 rounded p-2 whitespace-pre-wrap">
            {parseError}
          </pre>
        )}
        <p className="text-xs text-muted-foreground">
          Fix the YAML in the code editor, then return here.
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="nocode-editor" contentClass="p-4 space-y-5">
      <FlowPropertiesSection doc={doc} updateField={updateField} />
      <hr className="border-border" />
      <InputsSection doc={doc} updateField={updateField} />
      <hr className="border-border" />
      <TasksSection
        tasks={doc.tasks}
        updateTask={updateTask}
        addTask={addTask}
        removeTask={removeTask}
        reorderTasks={reorderTasks}
      />
      <hr className="border-border" />
      <ArraySection
        name="triggers"
        items={doc.triggers}
        onChange={(v) => updateField('triggers', v)}
      />
      <hr className="border-border" />
      <ArraySection
        name="errors"
        items={doc.errors}
        onChange={(v) => updateField('errors', v)}
      />
      <hr className="border-border" />
      <ArraySection
        name="finally"
        items={doc.finally}
        onChange={(v) => updateField('finally', v)}
      />
      <hr className="border-border" />
      <ArraySection
        name="outputs"
        items={doc.outputs}
        onChange={(v) => updateField('outputs', v)}
      />
      <hr className="border-border" />
      <ArraySection
        name="checks"
        items={doc.checks}
        onChange={(v) => updateField('checks', v)}
      />
      <hr className="border-border" />
      <ConcurrencySection
        concurrency={doc.concurrency}
        onChange={(v) => updateField('concurrency', v)}
      />
      <hr className="border-border" />
      <DisabledSection
        disabled={doc.disabled}
        onChange={(v) => updateField('disabled', v)}
      />
      <hr className="border-border" />
      <LabelsSection doc={doc} updateField={updateField} />
      <hr className="border-border" />
      <RetrySection
        retry={doc.retry}
        onChange={(v) => updateField('retry', v)}
      />
      <hr className="border-border" />
      <ArraySection
        name="sla"
        items={doc.sla}
        onChange={(v) => updateField('sla', v)}
      />
      <hr className="border-border" />
      <VariablesSection
        variables={doc.variables}
        onChange={(v) => updateField('variables', v)}
      />
      <hr className="border-border" />
      <WorkerGroupSection
        workerGroup={doc.workerGroup}
        onChange={(v) => updateField('workerGroup', v)}
      />
      <hr className="border-border" />
      <ArraySection
        name="pluginDefaults"
        items={doc.pluginDefaults}
        onChange={(v) => updateField('pluginDefaults', v)}
      />
      <hr className="border-border" />
      <ArraySection
        name="afterExecution"
        items={doc.afterExecution}
        onChange={(v) => updateField('afterExecution', v)}
      />
    </ScrollArea>
  );
}
