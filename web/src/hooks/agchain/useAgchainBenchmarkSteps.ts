import { useCallback, useEffect, useState } from 'react';
import {
  buildEmptyBenchmarkStepDraft,
  createAgchainBenchmarkStep,
  deleteAgchainBenchmarkStep,
  fetchAgchainBenchmarkDetail,
  fetchAgchainBenchmarkSteps,
  reorderAgchainBenchmarkSteps,
  type AgchainBenchmarkDetail,
  type AgchainBenchmarkStepWrite,
  type AgchainBenchmarkStepsDetail,
  updateAgchainBenchmarkStep,
} from '@/lib/agchainBenchmarks';
import { useAgchainProjectFocus } from './useAgchainProjectFocus';

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error';
}

export function useAgchainBenchmarkSteps() {
  const { focusedProject, loading: focusLoading } = useAgchainProjectFocus();
  const benchmarkSlug = focusedProject?.benchmark_slug;
  const [detail, setDetail] = useState<AgchainBenchmarkDetail | null>(null);
  const [stepsDetail, setStepsDetail] = useState<AgchainBenchmarkStepsDetail | null>(null);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirtyOrder, setDirtyOrder] = useState(false);

  const load = useCallback(async () => {
    if (focusLoading) {
      setLoading(true);
      return;
    }

    if (!benchmarkSlug) {
      setDetail(null);
      setStepsDetail(null);
      setSelectedStepId(null);
      setError(null);
      setDirtyOrder(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [nextDetail, nextSteps] = await Promise.all([
        fetchAgchainBenchmarkDetail(benchmarkSlug),
        fetchAgchainBenchmarkSteps(benchmarkSlug),
      ]);
      setDetail(nextDetail);
      setStepsDetail(nextSteps);
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
      setError(null);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  }, [benchmarkSlug, focusLoading]);

  useEffect(() => {
    void load();
  }, [load]);

  const steps = stepsDetail?.steps ?? [];
  const selectedStep = steps.find((step) => step.benchmark_step_id === selectedStepId) ?? null;
  const canEdit = stepsDetail?.can_edit ?? false;

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
    selectStep,
    moveStep,
    saveOrder,
    createStep,
    updateSelectedStep,
    deleteSelectedStep,
    reload: load,
    focusedProject,
    hasProjectFocus: Boolean(focusedProject),
  };
}
