import { useImpersonation } from '@/hooks/useImpersonation';
import { Button } from '@/components/ui/button';
import { AlertTriangle, X } from 'lucide-react';

export function ImpersonationBanner() {
  const { impersonation, isImpersonating, stopImpersonation } = useImpersonation();

  if (!isImpersonating || !impersonation) return null;

  return (
    <div className="bg-warning text-warning-foreground px-4 py-3 flex items-center justify-between border-b border-warning/20">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-5 w-5" />
        <div>
          <p className="font-semibold">
            Impersonation Mode Active
          </p>
          <p className="text-sm opacity-90">
            Viewing as: {impersonation.userEmail} ({impersonation.userRole})
          </p>
        </div>
      </div>
      <Button
        variant="secondary"
        size="sm"
        onClick={stopImpersonation}
        className="gap-2"
      >
        <X className="h-4 w-4" />
        Stop Impersonation
      </Button>
    </div>
  );
}
