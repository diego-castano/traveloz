'use client';

import { useRef, useEffect, useState, useCallback } from 'react';

export type AutoSaveStatus = 'saved' | 'saving' | 'unsaved';

interface UseAutoSaveOptions {
  onSave: () => void;
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

    timerRef.current = setTimeout(() => {
      setStatus('saving');
      // Simulate async save (in mockup, save is synchronous)
      setTimeout(() => {
        onSave();
        if (isMountedRef.current) setStatus('saved');
      }, 400);
    }, debounceMs);
  }, [onSave, debounceMs, enabled]);

  const saveNow = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setStatus('saving');
    setTimeout(() => {
      onSave();
      if (isMountedRef.current) setStatus('saved');
    }, 300);
  }, [onSave]);

  return { status, markDirty, saveNow };
}
