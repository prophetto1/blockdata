import { useMemo, useCallback, useRef } from 'react';
import {
  parseFlowYaml,
  serializeFlowDocument,
  type FlowDocument,
  type FlowTask,
} from './flow-document';

export type FlowDocumentHandle = {
  doc: FlowDocument | null;
  parseError: string | null;
  updateField: <K extends keyof Omit<FlowDocument, '_extra'>>(key: K, value: FlowDocument[K]) => void;
  updateTask: (index: number, patch: Partial<FlowTask>) => void;
  addTask: (task: FlowTask) => void;
  removeTask: (index: number) => void;
  reorderTasks: (fromIndex: number, toIndex: number) => void;
};

export function useFlowDocument(
  codeDraft: string,
  setCodeDraft: (next: string) => void,
): FlowDocumentHandle {
  const docRef = useRef<FlowDocument | null>(null);

  const parsed = useMemo(() => {
    try {
      const doc = parseFlowYaml(codeDraft);
      return { doc, error: null };
    } catch (e) {
      return { doc: null, error: e instanceof Error ? e.message : String(e) };
    }
  }, [codeDraft]);

  docRef.current = parsed.doc;

  const applyChange = useCallback(
    (mutate: (doc: FlowDocument) => FlowDocument) => {
      const current = docRef.current;
      if (!current) return;
      const next = mutate(current);
      setCodeDraft(serializeFlowDocument(next));
    },
    [setCodeDraft],
  );

  const updateField = useCallback(
    <K extends keyof Omit<FlowDocument, '_extra'>>(key: K, value: FlowDocument[K]) => {
      applyChange((doc) => ({ ...doc, [key]: value }));
    },
    [applyChange],
  );

  const updateTask = useCallback(
    (index: number, patch: Partial<FlowTask>) => {
      applyChange((doc) => ({
        ...doc,
        tasks: doc.tasks.map((t, i) => (i === index ? { ...t, ...patch } : t)),
      }));
    },
    [applyChange],
  );

  const addTask = useCallback(
    (task: FlowTask) => {
      applyChange((doc) => ({ ...doc, tasks: [...doc.tasks, task] }));
    },
    [applyChange],
  );

  const removeTask = useCallback(
    (index: number) => {
      applyChange((doc) => ({
        ...doc,
        tasks: doc.tasks.filter((_, i) => i !== index),
      }));
    },
    [applyChange],
  );

  const reorderTasks = useCallback(
    (fromIndex: number, toIndex: number) => {
      applyChange((doc) => {
        const tasks = [...doc.tasks];
        const [moved] = tasks.splice(fromIndex, 1);
        tasks.splice(toIndex, 0, moved);
        return { ...doc, tasks };
      });
    },
    [applyChange],
  );

  return {
    doc: parsed.doc,
    parseError: parsed.error,
    updateField,
    updateTask,
    addTask,
    removeTask,
    reorderTasks,
  };
}
