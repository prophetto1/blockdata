import { useCallback, useEffect, useMemo, useState } from 'react';
import { listPipelineSources, type PipelineSource } from '@/lib/pipelineService';
import {
  createPipelineSourceSet,
  getPipelineSourceSet,
  updatePipelineSourceSet,
  type PipelineSourceSet,
} from '@/lib/pipelineSourceSetService';

type UsePipelineSourceSetOptions = {
  projectId: string | null;
  pipelineKind: string | null;
};

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}

function orderSourceUids(sourceSet: PipelineSourceSet | null | undefined) {
  return sourceSet?.items
    ?.slice()
    .sort((left, right) => left.source_order - right.source_order)
    .map((item) => item.source_uid) ?? [];
}

export function usePipelineSourceSet({
  projectId,
  pipelineKind,
}: UsePipelineSourceSetOptions) {
  const [sources, setSources] = useState<PipelineSource[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [sourcesError, setSourcesError] = useState<string | null>(null);
  const [sourceSetLabel, setSourceSetLabel] = useState('Release corpus');
  const [selectedSourceUids, setSelectedSourceUids] = useState<string[]>([]);
  const [activeSourceSetId, setActiveSourceSetId] = useState<string | null>(null);
  const [sourceSetError, setSourceSetError] = useState<string | null>(null);
  const [isPersisting, setIsPersisting] = useState(false);

  const selectedSources = useMemo(() => selectedSourceUids
    .map((sourceUid) => sources.find((source) => source.source_uid === sourceUid))
    .filter((source): source is PipelineSource => Boolean(source)), [selectedSourceUids, sources]);

  const hydrateSourceSet = useCallback((sourceSet: PipelineSourceSet | null) => {
    if (!sourceSet) return;
    setActiveSourceSetId(sourceSet.source_set_id);
    setSourceSetLabel(sourceSet.label);
    setSelectedSourceUids(orderSourceUids(sourceSet));
  }, []);

  const refreshSources = useCallback(async () => {
    if (!projectId || !pipelineKind) {
      setSources([]);
      setSourcesError(null);
      setSelectedSourceUids([]);
      return [];
    }

    try {
      setSourcesLoading(true);
      setSourcesError(null);
      const items = await listPipelineSources({ projectId, pipelineKind });
      setSources(items);
      setSelectedSourceUids((current) => current.filter((sourceUid) => items.some((item) => item.source_uid === sourceUid)));
      return items;
    } catch (error) {
      setSources([]);
      setSourcesError(toErrorMessage(error, 'Unable to load your sources.'));
      return [];
    } finally {
      setSourcesLoading(false);
    }
  }, [pipelineKind, projectId]);

  const refreshSourceSet = useCallback(async () => {
    if (!projectId || !pipelineKind || !activeSourceSetId) {
      setActiveSourceSetId(null);
      setSourceSetError(null);
      return null;
    }

    try {
      setSourceSetError(null);
      const detail = await getPipelineSourceSet({
        pipelineKind,
        sourceSetId: activeSourceSetId,
      });
      hydrateSourceSet(detail);
      return detail;
    } catch (error) {
      setSourceSetError(toErrorMessage(error, 'Unable to load the current source set.'));
      return null;
    }
  }, [activeSourceSetId, hydrateSourceSet, pipelineKind, projectId]);

  useEffect(() => {
    if (!projectId || !pipelineKind) {
      setSources([]);
      setSourcesError(null);
      setSourceSetError(null);
      setSelectedSourceUids([]);
      setActiveSourceSetId(null);
      return;
    }

    void refreshSources();
    if (activeSourceSetId) {
      void refreshSourceSet();
    }
  }, [pipelineKind, projectId, refreshSourceSet, refreshSources]);

  const toggleSource = useCallback((sourceUid: string) => {
    setSelectedSourceUids((current) => (
      current.includes(sourceUid)
        ? current.filter((item) => item !== sourceUid)
        : current.concat(sourceUid)
    ));
  }, []);

  const moveSource = useCallback((sourceUid: string, direction: -1 | 1) => {
    setSelectedSourceUids((current) => {
      const index = current.indexOf(sourceUid);
      if (index === -1) return current;
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const next = current.slice();
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }, []);

  const removeSource = useCallback((sourceUid: string) => {
    setSelectedSourceUids((current) => current.filter((item) => item !== sourceUid));
  }, []);

  const appendSelection = useCallback((sourceUids: string[]) => {
    setSelectedSourceUids((current) => {
      const next = current.slice();
      for (const sourceUid of sourceUids) {
        if (!next.includes(sourceUid)) {
          next.push(sourceUid);
        }
      }
      return next;
    });
  }, []);

  const replaceSelection = useCallback((sourceUids: string[]) => {
    setSelectedSourceUids(sourceUids.slice());
  }, []);

  const resetSelection = useCallback(() => {
    setSelectedSourceUids([]);
    setActiveSourceSetId(null);
    setSourceSetLabel('');
    setSourceSetError(null);
  }, []);

  const loadSourceSet = useCallback(async (sourceSetId: string) => {
    if (!pipelineKind) return null;
    try {
      setSourceSetError(null);
      const detail = await getPipelineSourceSet({ pipelineKind, sourceSetId });
      hydrateSourceSet(detail);
      return detail;
    } catch (error) {
      setSourceSetError(toErrorMessage(error, 'Unable to load the selected source set.'));
      return null;
    }
  }, [hydrateSourceSet, pipelineKind]);

  const persistSourceSet = useCallback(async () => {
    if (!projectId || !pipelineKind) {
      throw new Error('Select a project before starting processing.');
    }
    if (selectedSourceUids.length === 0) {
      throw new Error('Select at least one markdown file before starting processing.');
    }
    const trimmedLabel = sourceSetLabel.trim();
    if (!trimmedLabel) {
      throw new Error('Provide a source set label before starting processing.');
    }
    const selectedPipelineSourceIds = selectedSources.map((source) => source.pipeline_source_id);
    if (selectedPipelineSourceIds.length !== selectedSourceUids.length) {
      throw new Error('Refresh the file list before saving this draft.');
    }

    try {
      setIsPersisting(true);
      setSourceSetError(null);
      const nextSourceSet = activeSourceSetId
        ? await updatePipelineSourceSet({
          pipelineKind,
          sourceSetId: activeSourceSetId,
          label: trimmedLabel,
          pipelineSourceIds: selectedPipelineSourceIds,
        })
        : await createPipelineSourceSet({
          pipelineKind,
          projectId,
          label: trimmedLabel,
          pipelineSourceIds: selectedPipelineSourceIds,
        });
      hydrateSourceSet(nextSourceSet);
      return nextSourceSet;
    } catch (error) {
      const message = toErrorMessage(error, 'Unable to save the selected source set.');
      setSourceSetError(message);
      throw new Error(message);
    } finally {
      setIsPersisting(false);
    }
  }, [
    activeSourceSetId,
    hydrateSourceSet,
    pipelineKind,
    projectId,
    selectedSourceUids,
    selectedSources,
    sourceSetLabel,
  ]);

  return {
    sources,
    sourcesLoading,
    sourcesError,
    sourceSetLabel,
    setSourceSetLabel,
    selectedSourceUids,
    selectedSources,
    activeSourceSetId,
    sourceSetError,
    isPersisting,
    toggleSource,
    moveSource,
    removeSource,
    appendSelection,
    replaceSelection,
    refreshSources,
    refreshSourceSet,
    resetSelection,
    loadSourceSet,
    persistSourceSet,
  };
}
