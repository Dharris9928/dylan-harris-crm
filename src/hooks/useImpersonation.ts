import { useState, useEffect } from 'react';

const IMPERSONATION_KEY = 'admin-impersonation';

export interface ImpersonationData {
  userId: string;
  userEmail: string;
  userRole: string;
}

export function useImpersonation() {
  const [impersonation, setImpersonation] = useState<ImpersonationData | null>(() => {
    const stored = sessionStorage.getItem(IMPERSONATION_KEY);
    return stored ? JSON.parse(stored) : null;
  });

  const startImpersonation = (data: ImpersonationData) => {
    sessionStorage.setItem(IMPERSONATION_KEY, JSON.stringify(data));
    setImpersonation(data);
    // Reload to apply impersonation across all hooks
    window.location.reload();
  };

  const stopImpersonation = () => {
    sessionStorage.removeItem(IMPERSONATION_KEY);
    setImpersonation(null);
    // Reload to clear impersonation
    window.location.reload();
  };

  const isImpersonating = impersonation !== null;

  return {
    impersonation,
    isImpersonating,
    startImpersonation,
    stopImpersonation,
  };
}
