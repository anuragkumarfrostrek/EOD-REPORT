'use client';
import { useEffect, useRef, useCallback } from 'react';

export function useAutoSave(data, onSave, delay = 1500) {
  const timerRef = useRef(null);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const debouncedSave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onSaveRef.current(data);
    }, delay);
  }, [data, delay]);

  useEffect(() => {
    debouncedSave();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [debouncedSave]);
}

export function useDraftStorage(key) {
  const saveDraft = useCallback((data) => {
    try {
      localStorage.setItem(`eod_draft_${key}`, JSON.stringify(data));
    } catch (e) {}
  }, [key]);

  const loadDraft = useCallback(() => {
    try {
      const raw = localStorage.getItem(`eod_draft_${key}`);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }, [key]);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(`eod_draft_${key}`);
    } catch (e) {}
  }, [key]);

  return { saveDraft, loadDraft, clearDraft };
}
