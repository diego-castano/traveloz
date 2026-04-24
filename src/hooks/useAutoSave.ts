'use client';

import { useRef, useEffect, useState, useCallback } from 'react';

export type AutoSaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

interface UseAutoSaveOptions {
  onSave: () => void | Promise<void>;
  debounceMs?: number;
  enabled?: boolean;
}

export function useAutoSave({ onSave, debounceMs = 800, enabled = true }: UseAutoSaveOptions) {
  const [status, setStatus] = useState<AutoSaveStatus>('saved');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const onSaveRef = useRef(onSave);
  const isSavingRef = useRef(false);
  const hasQueuedSaveRef = useRef(false);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const runSave = useCallback(async () => {
    if (!enabled) return;

    if (isSavingRef.current) {
      hasQueuedSaveRef.current = true;
      return;
    }

    isSavingRef.current = true;
    try {
      while (true) {
        if (isMountedRef.current) setStatus('saving');
        await onSaveRef.current();

        if (!hasQueuedSaveRef.current) break;
        hasQueuedSaveRef.current = false;
      }

      if (isMountedRef.current) setStatus('saved');
    } catch (err) {
      console.error('Auto-save failed:', err);
      if (isMountedRef.current) setStatus('error');
    } finally {
      isSavingRef.current = false;
    }
  }, [enabled]);

  const markDirty = useCallback(() => {
    if (!enabled) return;
    setStatus('unsaved');

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      void runSave();
    }, debounceMs);
  }, [debounceMs, enabled, runSave]);

  const saveNow = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    hasQueuedSaveRef.current = false;
    await runSave();
  }, [runSave]);

  return { status, markDirty, saveNow };
}
