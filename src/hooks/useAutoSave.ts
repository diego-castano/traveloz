'use client';

import { useRef, useEffect, useState, useCallback } from 'react';

export type AutoSaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

interface UseAutoSaveOptions {
  onSave: () => void | Promise<void>;
  debounceMs?: number;
  enabled?: boolean;
}

export function useAutoSave({ onSave, debounceMs = 2000, enabled = true }: UseAutoSaveOptions) {
  const [status, setStatus] = useState<AutoSaveStatus>('saved');
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const markDirty = useCallback(() => {
    if (!enabled) return;
    setStatus('unsaved');

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      setStatus('saving');
      try {
        await onSave();
        if (isMountedRef.current) setStatus('saved');
      } catch (err) {
        console.error('Auto-save failed:', err);
        if (isMountedRef.current) setStatus('error');
      }
    }, debounceMs);
  }, [onSave, debounceMs, enabled]);

  const saveNow = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setStatus('saving');
    try {
      await onSave();
      if (isMountedRef.current) setStatus('saved');
    } catch (err) {
      console.error('Save failed:', err);
      if (isMountedRef.current) setStatus('error');
    }
  }, [onSave]);

  return { status, markDirty, saveNow };
}
