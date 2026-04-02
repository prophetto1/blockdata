import { useCallback, useEffect, useState } from 'react';
import {
  buildEmptyBenchmarkStepDraft,
  createAgchainBenchmarkStep,
  deleteAgchainBenchmarkStep,
  fetchAgchainBenchmarkToolBag,
  fetchAgchainBenchmarkWorkbenchDetail,
  fetchAgchainResolvedBenchmarkTools,
  fetchAgchainBenchmarkSteps,
  replaceAgchainBenchmarkToolBag,
  type AgchainBenchmarkToolBinding,
  type AgchainResolvedBenchmarkTool,
  reorderAgchainBenchmarkSteps,
  type AgchainBenchmarkWorkbenchDetail,
  type AgchainBenchmarkStepWrite,
  type AgchainBenchmarkStepsDetail,
  updateAgchainBenchmarkStep,
} from '@/lib/agchainBenchmarks';
import { listAgchainTools, type AgchainToolRegistryRow } from '@/lib/agchainTools';
import { useAgchainProjectFocus } from './useAgchainProjectFocus';

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error';
}

export function useAgchainBenchmarkSteps() {
  const { focusedProject, loading: focusLoading } = useAgchainProjectFocus();
  const benchmarkSlug = focusedProject?.benchmark_slug;
  const projectId = focusedProject?.project_id ?? null;
  const [detail, setDetail] = useState<AgchainBenchmarkWorkbenchDetail | null>(null);
  const [stepsDetail, setStepsDetail] = useState<AgchainBenchmarkStepsDetail | null>(null);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirtyOrder, setDirtyOrder] = useState(false);
  const [toolRefs, setToolRefs] = useState<AgchainBenchmarkToolBinding[]>([]);
  const [resolvedTools, setResolvedTools] = useState<AgchainResolvedBenchmarkTool[]>([]);
  const [availableTools, setAvailableTools] = useState<AgchainToolRegistryRow[]>([]);
  const [dirtyToolBag, setDirtyToolBag] = useState(false);

  const load = useCallback(async () => {
    if (focusLoading) {
      setLoading(true);
      return;
    }

    if (!benchmarkSlug || !projectId) {
      setDetail(null);
      setStepsDetail(null);
      setSelectedStepId(null);
      setError(null);
      setDirtyOrder(false);
      setToolRefs([]);
      setResolvedTools([]);
      setAvailableTools([]);
      setDirtyToolBag(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [nextDetail, nextSteps] = await Promise.all([
        fetchAgchainBenchmarkWorkbenchDetail(benchmarkSlug),
        fetchAgchainBenchmarkSteps(benchmarkSlug),
      ]);
      const currentVersionId = nextDetail.current_version?.benchmark_version_id ?? null;
      const [nextToolRefs, nextResolvedTools, nextAvailableTools] = currentVersionId
        ? await Promise.all([
            fetchAgchainBenchmarkToolBag(benchmarkSlug, currentVersionId),
            fetchAgchainResolvedBenchmarkTools(benchmarkSlug, currentVersionId),
            listAgchainTools(projectId),
          ])
        : [[], [], { items: [] }];
      setDetail(nextDetail);
      setStepsDetail(nextSteps);
      setToolRefs(nextToolRefs);
      setResolvedTools(nextResolvedTools);
      setAvailableTools(nextAvailableTools.items);
      setSelectedStepId((currentSelectedStepId) => {
        if (
          currentSelectedStepId &&
          nextSteps.steps.some((step) => step.benchmark_step_id === currentSelectedStepId)
        ) {
          return currentSelectedStepId;
        }
        return nextSteps.steps[0]?.benchmark_step_id ?? null;
      });
      setDirtyOrder(false);
      setDirtyToolBag(false);
      setError(null);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  }, [benchmarkSlug, focusLoading, projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const steps = stepsDetail?.steps ?? [];
  const selectedStep = steps.find((step) => step.benchmark_step_id === selectedStepId) ?? null;
  const canEdit = stepsDetail?.can_edit ?? false;
  const availableToolOptions = availableTools.filter(
    (row): row is AgchainToolRegistryRow & { tool_ref: string } => Boolean(row.tool_ref),
  );

  const addToolRef = useCallback(() => {
    const defaultTool = availableToolOptions[0];
    if (!defaultTool?.tool_ref) {
      return;
    }

    setToolRefs((current) => [
      ...current,
      {
        position: current.length + 1,
        tool_ref: defaultTool.tool_ref,
        source_kind: defaultTool.source_kind,
        tool_version_id: defaultTool.latest_version?.tool_version_id ?? null,
        alias: null,
        config_overrides_jsonb: {},
        display_name: defaultTool.display_name,
      },
    ]);
    setDirtyToolBag(true);
  }, [availableToolOptions]);

  const updateToolRef = useCallback(
    (position: number, updates: Partial<AgchainBenchmarkToolBinding>) => {
      setToolRefs((current) =>
        current.map((binding) => {
          if (binding.position !== position) {
            return binding;
          }

          if (updates.tool_ref) {
            const matchedTool = availableToolOptions.find((row) => row.tool_ref === updates.tool_ref);
            return {
              ...binding,
              ...updates,
              source_kind: matchedTool?.source_kind ?? updates.source_kind ?? binding.source_kind,
              tool_version_id:
                matchedTool?.latest_version?.tool_version_id ??
                (matchedTool?.source_kind === 'builtin' ? null : updates.tool_version_id ?? binding.tool_version_id),
              display_name: matchedTool?.display_name ?? updates.display_name ?? binding.display_name,
            };
          }

          return {
            ...binding,
            ...updates,
          };
        }),
      );
      setDirtyToolBag(true);
    },
    [availableToolOptions],
  );

  const moveToolRef = useCallback((position: number, direction: -1 | 1) => {
    setToolRefs((current) => {
      const currentIndex = current.findIndex((binding) => binding.position === position);
      const nextIndex = currentIndex + direction;
      if (currentIndex === -1 || nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }

      const nextBindings = [...current];
      const [movedBinding] = nextBindings.splice(currentIndex, 1);
      nextBindings.splice(nextIndex, 0, movedBinding);
      setDirtyToolBag(true);
      return nextBindings.map((binding, index) => ({ ...binding, position: index + 1 }));
    });
  }, []);

  const removeToolRef = useCallback((position: number) => {
    setToolRefs((current) => current
      .filter((binding) => binding.position !== position)
      .map((binding, index) => ({ ...binding, position: index + 1 })));
    setDirtyToolBag(true);
  }, []);

  const selectStep = useCallback((benchmarkStepId: string) => {
    setSelectedStepId(benchmarkStepId);
  }, []);

  const moveStep = useCallback((benchmarkStepId: string, direction: -1 | 1) => {
    setStepsDetail((current) => {
      if (!current) {
        return current;
      }

      const currentIndex = current.steps.findIndex((step) => step.benchmark_step_id === benchmarkStepId);
      const nextIndex = currentIndex + direction;
      if (currentIndex === -1 || nextIndex < 0 || nextIndex >= current.steps.length) {
        return current;
      }

      const nextSteps = [...current.steps];
      const [movedStep] = nextSteps.splice(currentIndex, 1);
      nextSteps.splice(nextIndex, 0, movedStep);
      const normalizedSteps = nextSteps.map((step, index) => ({ ...step, step_order: index + 1 }));
      setDirtyOrder(true);
      return {
        ...current,
        steps: normalizedSteps,
      };
    });
  }, []);

  const saveOrder = useCallback(async () => {
    if (!benchmarkSlug || !stepsDetail || !dirtyOrder) {
      return;
    }

    setMutating(true);
    try {
      await reorderAgchainBenchmarkSteps(
        benchmarkSlug,
        stepsDetail.steps.map((step) => step.benchmark_step_id),
      );
      await load();
      setError(null);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
      throw nextError;
    } finally {
      setMutating(false);
    }
  }, [benchmarkSlug, dirtyOrder, load, stepsDetail]);

  const createStep = useCallback(async () => {
    if (!benchmarkSlug) {
      throw new Error('No benchmark selected');
    }

    setMutating(true);
    try {
      const nextDraft = buildEmptyBenchmarkStepDraft((stepsDetail?.steps.length ?? 0) + 1);
      const result = await createAgchainBenchmarkStep(benchmarkSlug, nextDraft);
      await load();
      setSelectedStepId(result.benchmark_step_id);
      setError(null);
      return result;
    } catch (nextError) {
      setError(getErrorMessage(nextError));
      throw nextError;
    } finally {
      setMutating(false);
    }
  }, [benchmarkSlug, load, stepsDetail?.steps.length]);

  const updateSelectedStep = useCallback(
    async (payload: AgchainBenchmarkStepWrite) => {
      if (!benchmarkSlug || !selectedStep) {
        throw new Error('No benchmark step selected');
      }

      setMutating(true);
      try {
        const result = await updateAgchainBenchmarkStep(
          benchmarkSlug,
          selectedStep.benchmark_step_id,
          payload,
        );
        await load();
        setSelectedStepId(result.benchmark_step_id);
        setError(null);
        return result;
      } catch (nextError) {
        setError(getErrorMessage(nextError));
        throw nextError;
      } finally {
        setMutating(false);
      }
    },
    [benchmarkSlug, load, selectedStep],
  );

  const deleteSelectedStep = useCallback(async () => {
    if (!benchmarkSlug || !selectedStep) {
      throw new Error('No benchmark step selected');
    }

    const deletedStepId = selectedStep.benchmark_step_id;
    setMutating(true);
    try {
      await deleteAgchainBenchmarkStep(benchmarkSlug, deletedStepId);
      await load();
      setSelectedStepId((currentSelectedStepId) =>
        currentSelectedStepId === deletedStepId ? null : currentSelectedStepId,
      );
      setError(null);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
      throw nextError;
    } finally {
      setMutating(false);
    }
  }, [benchmarkSlug, load, selectedStep]);

  const saveToolBag = useCallback(async () => {
    const currentVersionId = detail?.current_version?.benchmark_version_id ?? stepsDetail?.current_version?.benchmark_version_id;
    if (!benchmarkSlug || !currentVersionId || !dirtyToolBag) {
      return;
    }

    setMutating(true);
    try {
      await replaceAgchainBenchmarkToolBag(
        benchmarkSlug,
        currentVersionId,
        toolRefs.map((binding) => ({
          tool_ref: binding.tool_ref,
          tool_version_id: binding.tool_version_id,
          alias: binding.alias,
          config_overrides_jsonb: binding.config_overrides_jsonb ?? {},
        })),
      );
      await load();
      setError(null);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
      throw nextError;
    } finally {
      setMutating(false);
    }
  }, [benchmarkSlug, detail?.current_version?.benchmark_version_id, dirtyToolBag, load, stepsDetail?.current_version?.benchmark_version_id, toolRefs]);

  return {
    benchmark: detail?.benchmark ?? stepsDetail?.benchmark ?? null,
    currentVersion: detail?.current_version ?? stepsDetail?.current_version ?? null,
    counts: detail?.counts ?? { selected_eval_model_count: 0, tested_model_count: 0 },
    steps,
    selectedStepId,
    selectedStep,
    canEdit,
    loading,
    mutating,
    error,
    dirtyOrder,
    toolRefs,
    resolvedTools,
    availableTools: availableToolOptions,
    dirtyToolBag,
    selectStep,
    moveStep,
    saveOrder,
    createStep,
    updateSelectedStep,
    deleteSelectedStep,
    addToolRef,
    updateToolRef,
    moveToolRef,
    removeToolRef,
    saveToolBag,
    reload: load,
    focusedProject,
    hasProjectFocus: Boolean(focusedProject),
  };
}
