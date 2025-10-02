import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface EnrichmentConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  fieldsToOverwrite: Record<string, { current: any; new: any }>;
  fieldsEnriched: string[];
  isConfirming?: boolean;
}

export function EnrichmentConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  fieldsToOverwrite,
  fieldsEnriched,
  isConfirming = false,
}: EnrichmentConfirmDialogProps) {
  const overwriteCount = Object.keys(fieldsToOverwrite).length;
  const newFieldsCount = fieldsEnriched.length - overwriteCount;

  const formatFieldName = (field: string) => {
    return field
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatValue = (value: any) => {
    if (value === null || value === undefined || value === '') return '(empty)';
    if (Array.isArray(value)) return value.join(', ');
    return String(value);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Data Enrichment</AlertDialogTitle>
          <AlertDialogDescription>
            <strong className="text-warning">⚠️ IMPORTANT: This will research and automatically update ALL company data fields.</strong>
            <br /><br />
            The enrichment will update {fieldsEnriched.length} fields based on comprehensive research from multiple sources including Apollo.io and AI analysis.
            {overwriteCount > 0 && (
              <span className="text-warning font-medium block mt-2">
                {overwriteCount} existing fields will be overwritten with newly researched data.
              </span>
            )}
            {newFieldsCount > 0 && (
              <span className="text-muted-foreground block mt-1">
                {newFieldsCount} empty fields will be filled with researched data.
              </span>
            )}
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded">
              <p className="text-sm text-blue-900 dark:text-blue-100 font-medium">
                📊 Business metrics, digital engagement, and contact information will all be comprehensively researched and auto-updated.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {overwriteCount > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-warning border-warning">
                Fields to Overwrite
              </Badge>
            </div>
            <ScrollArea className="h-[300px] rounded-md border border-border p-4">
              <div className="space-y-4">
                {Object.entries(fieldsToOverwrite).map(([field, values]) => (
                  <div key={field} className="space-y-1">
                    <p className="text-sm font-medium">{formatFieldName(field)}</p>
                    <div className="pl-4 space-y-1 text-sm">
                      <p className="text-muted-foreground">
                        Current: <span className="text-foreground">{formatValue(values.current)}</span>
                      </p>
                      <p className="text-muted-foreground">
                        New: <span className="text-primary font-medium">{formatValue(values.new)}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isConfirming}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isConfirming}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isConfirming ? 'Applying Changes...' : 'Confirm & Enrich'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
