import { ReactNode } from 'react';
import { useFieldPermissions } from '@/hooks/useFieldPermissions';
import { Lock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ProtectedFieldProps {
  tableName: string;
  fieldName: string;
  value: string | null | undefined;
  children?: ReactNode;
  showLockIcon?: boolean;
}

export function ProtectedField({
  tableName,
  fieldName,
  value,
  children,
  showLockIcon = true
}: ProtectedFieldProps) {
  const { canAccessField, maskField, isLoading } = useFieldPermissions();

  if (isLoading) {
    return <span className="text-muted-foreground">Loading...</span>;
  }

  const hasAccess = canAccessField(tableName, fieldName);
  const displayValue = hasAccess 
    ? value 
    : maskField(value || '', tableName, fieldName);

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
