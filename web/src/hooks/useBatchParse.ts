import { useCallback, useRef, useState } from 'react';
import { edgeFetch } from '@/lib/edge';

export type FileDispatchStatus = 'idle' | 'queued' | 'dispatching' | 'dispatched' | 'dispatch_error';

interface UseBatchParseOptions {
  profileId: string;
  pipelineConfig: Record<string, unknown>;
  concurrency?: number;
}

interface BatchParseProgress {
  queued: number;
  dispatching: number;
  dispatched: number;
  errors: number;
  total: number;
}

export function useBatchParse(options: UseBatchParseOptions) {
  const { profileId, pipelineConfig, concurrency = 3 } = options;

  const [dispatchStatus, setDispatchStatus] = useState<Map<string, FileDispatchStatus>>(new Map());
  const [errors, setErrors] = useState<Map<string, string>>(new Map());
  const [isRunning, setIsRunning] = useState(false);
  const cancelledRef = useRef(false);

  const updateStatus = (uid: string, status: FileDispatchStatus) => {
    setDispatchStatus((prev) => new Map(prev).set(uid, status));
  };

  const updateError = (uid: string, message: string) => {
    setErrors((prev) => new Map(prev).set(uid, message));
  };

  const dispatchOne = async (sourceUid: string): Promise<void> => {
    if (cancelledRef.current) return;
    updateStatus(sourceUid, 'dispatching');
    try {
      const resp = await edgeFetch('trigger-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_uid: sourceUid,
          profile_id: profileId,
          pipeline_config: pipelineConfig,
        }),
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        throw new Error(`HTTP ${resp.status}: ${text.slice(0, 300)}`);
      }
      updateStatus(sourceUid, 'dispatched');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      updateStatus(sourceUid, 'dispatch_error');
      updateError(sourceUid, message);
    }
  };

  const start = useCallback(
    (sourceUids: string[]) => {
      if (sourceUids.length === 0) return;
      cancelledRef.current = false;
      setIsRunning(true);
      setErrors(new Map());

      const initial = new Map<string, FileDispatchStatus>();
      for (const uid of sourceUids) initial.set(uid, 'queued');
      setDispatchStatus(initial);

      const queue = [...sourceUids];
      let active = 0;
      let idx = 0;

      const next = () => {
        while (active < concurrency && idx < queue.length) {
          if (cancelledRef.current) break;
          const uid = queue[idx++]!;
          active++;
          dispatchOne(uid).finally(() => {
            active--;
            if (cancelledRef.current || (idx >= queue.length && active === 0)) {
              setIsRunning(false);
            }
            next();
          });
        }
        if (idx >= queue.length && active === 0) {
          setIsRunning(false);
        }
      };

      next();
    },
    [profileId, pipelineConfig, concurrency],
  );

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    setIsRunning(false);
  }, []);

  const progress: BatchParseProgress = (() => {
    let queued = 0;
    let dispatching = 0;
    let dispatched = 0;
    let errs = 0;
    dispatchStatus.forEach((s) => {
      if (s === 'queued') queued++;
      else if (s === 'dispatching') dispatching++;
      else if (s === 'dispatched') dispatched++;
      else if (s === 'dispatch_error') errs++;
    });
    return { queued, dispatching, dispatched, errors: errs, total: dispatchStatus.size };
  })();

  return { dispatchStatus, progress, start, cancel, isRunning, errors };
}