import { useState, useEffect } from 'react';
import { Perspective } from '@/components/common/PerspectiveSelector';

const PERSPECTIVE_STORAGE_KEY = 'user-perspective-filter';

export function usePerspective(defaultPerspective: Perspective = 'my_records') {
  const [perspective, setPerspective] = useState<Perspective>(() => {
    const stored = localStorage.getItem(PERSPECTIVE_STORAGE_KEY);
    return (stored as Perspective) || defaultPerspective;
  });

  useEffect(() => {
    localStorage.setItem(PERSPECTIVE_STORAGE_KEY, perspective);
  }, [perspective]);

  return {
    perspective,
    setPerspective,
  };
}
