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
  // True cuando hay una edición marcada dirty cuyo guardado todavía no arrancó
  // (debounce pendiente). Lo usamos para hacer flush en el unmount.
  const pendingRef = useRef(false);
  // Espejo de `enabled` para leerlo en el cleanup de unmount (deps []).
  const enabledRef = useRef(enabled);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      // Flush en unmount: si el operador cambió de tab con un debounce pendiente,
      // disparamos el guardado igual (fire-and-forget) para no perder la edición.
      // No tocamos el status porque el componente ya se desmontó.
      if (pendingRef.current && enabledRef.current) {
        pendingRef.current = false;
        void onSaveRef.current();
      }
    };
  }, []);

  // Devuelve true si el guardado terminó OK, false si falló. Permite que los
  // llamadores manuales (saveNow) sepan el resultado y no muestren un toast de
  // éxito engañoso cuando el server rechazó el guardado.
  const runSave = useCallback(async (): Promise<boolean> => {
    if (!enabled) return false;

    if (isSavingRef.current) {
      hasQueuedSaveRef.current = true;
      return true;
    }

    // El guardado arrancó: ya no hay debounce pendiente que flushear.
    pendingRef.current = false;
    isSavingRef.current = true;
    try {
      while (true) {
        if (isMountedRef.current) setStatus('saving');
        await onSaveRef.current();

        if (!hasQueuedSaveRef.current) break;
        hasQueuedSaveRef.current = false;
      }

      if (isMountedRef.current) setStatus('saved');
      return true;
    } catch (err) {
      console.error('Auto-save failed:', err);
      if (isMountedRef.current) setStatus('error');
      return false;
    } finally {
      isSavingRef.current = false;
    }
  }, [enabled]);

  const markDirty = useCallback(() => {
    if (!enabled) return;
    setStatus('unsaved');
    pendingRef.current = true;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      void runSave();
    }, debounceMs);
  }, [debounceMs, enabled, runSave]);

  const saveNow = useCallback(async (): Promise<boolean> => {
    if (timerRef.current) clearTimeout(timerRef.current);
    hasQueuedSaveRef.current = false;
    return runSave();
  }, [runSave]);

  return { status, markDirty, saveNow };
}
