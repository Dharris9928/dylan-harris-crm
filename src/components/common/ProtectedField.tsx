import { ReactNode } from 'react';
import { useFieldPermissions } from '@/hooks/useFieldPermissions';
import { Lock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { RequestAccessButton } from './RequestAccessButton';

interface ProtectedFieldProps {
  tableName: string;
  fieldName: string;
  value: string | null | undefined;
  children?: ReactNode;
  showLockIcon?: boolean;
  recordId?: string;
  recordName?: string;
  enableAccessRequest?: boolean;
}

export function ProtectedField({
  tableName,
  fieldName,
  value,
  children,
  showLockIcon = true,
  recordId,
  recordName,
  enableAccessRequest = false
}: ProtectedFieldProps) {
  const { canAccessField, maskField, isLoading } = useFieldPermissions();

  if (isLoading) {
    return <span className="text-muted-foreground">Loading...</span>;
  }

  const hasAccess = canAccessField(tableName, fieldName);
  
  // For identifying fields like company_name, always show the value
  // so users can identify which record they're requesting access to
  const isIdentifyingField = fieldName === 'company_name' || fieldName === 'name';
  const displayValue = (hasAccess || isIdentifyingField)
    ? value 
    : maskField(value || '', tableName, fieldName);

  // If no access and access requests are enabled, show request button
  if (!hasAccess && enableAccessRequest && recordId) {
    return (
      <div className="inline-flex items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Lock className="h-3 w-3" />
                {displayValue}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>Request access to view this field</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <RequestAccessButton
          tableName={tableName as 'companies' | 'contacts' | 'opportunities'}
          recordId={recordId}
          recordName={recordName}
          size="sm"
          variant="ghost"
        />
      </div>
    );
  }

  if (!hasAccess && showLockIcon) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Lock className="h-3 w-3" />
              {displayValue}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>You don't have permission to view this field</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (children) {
    return <>{children}</>;
  }

  return <span>{displayValue}</span>;
}
