import { Button } from "@/components/ui/button";
import { X, Trash2, Edit, Mail, Sparkles } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { EnrichmentConfirmDialog } from "./EnrichmentConfirmDialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useUserRole } from "@/hooks/useUserRole";

interface BulkActionBarProps {
  selectedCount: number;
  selectedIds: string[];
  onClearSelection: () => void;
  onActionComplete: () => void;
}

export function BulkActionBar({
  selectedCount,
  selectedIds,
  onClearSelection,
  onActionComplete,
}: BulkActionBarProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichProgress, setEnrichProgress] = useState({ current: 0, total: 0 });
  const [showEnrichConfirm, setShowEnrichConfirm] = useState(false);
  const [bulkEnrichPreviews, setBulkEnrichPreviews] = useState<any[]>([]);
  const { toast } = useToast();
  const { data: userRole, isLoading: roleLoading } = useUserRole();
  
  const canEnrich = userRole?.hasElevatedAccess || false;

  const handleBulkStatusChange = async (status: "Lead" | "Contacted" | "Engaged" | "Pilot" | "Active" | "Inactive" | "Lost") => {
    try {
      const { error } = await supabase
        .from("companies")
        .update({ status } as any)
        .in("id", selectedIds);

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `${selectedCount} companies updated to ${status}`,
      });

      onClearSelection();
      onActionComplete();
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: "Failed to update company status",
        variant: "destructive",
      });
    }
  };

  const handleBulkDelete = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("companies")
        .delete()
        .in("id", selectedIds);

      if (error) throw error;

      toast({
        title: "Companies Deleted",
        description: `${selectedCount} companies have been deleted`,
      });

      onClearSelection();
      onActionComplete();
      setShowDeleteDialog(false);
    } catch (error) {
      console.error("Error deleting companies:", error);
      toast({
        title: "Error",
        description: "Failed to delete companies",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkEmail = async () => {
    try {
      const { data: companies } = await supabase
        .from("companies")
        .select("company_name, primary_phone")
        .in("id", selectedIds);

      if (companies) {
        const emailList = companies
          .map(c => c.company_name)
          .join(", ");
        
        toast({
          title: "Email Feature",
          description: `Email campaign would be sent to: ${emailList}`,
        });
      }
    } catch (error) {
      console.error("Error preparing bulk email:", error);
      toast({
        title: "Error",
        description: "Failed to prepare bulk email",
        variant: "destructive",
      });
    }
  };

  const handleBulkEnrich = async () => {
    setIsEnriching(true);
    
    try {
      // First, get previews for all companies
      const previews = [];
      for (const companyId of selectedIds) {
        const { data, error } = await supabase.functions.invoke('enrich-company', {
          body: { companyId, deepEnrich: false, previewOnly: true }
        });
        if (!error && data) {
          previews.push({ companyId, ...data });
        }
      }

      // Check if any have fields to overwrite
      const hasOverwrites = previews.some(p => 
        p.fieldsToOverwrite && Object.keys(p.fieldsToOverwrite).length > 0
      );

      if (hasOverwrites) {
        // Show aggregate confirmation
        setBulkEnrichPreviews(previews);
        setShowEnrichConfirm(true);
        setIsEnriching(false);
      } else {
        // No conflicts, proceed directly
        await executeBulkEnrichment();
      }
    } catch (error) {
      console.error('Error preparing bulk enrichment:', error);
      toast({
        title: 'Error',
        description: 'Failed to prepare bulk enrichment',
        variant: 'destructive'
      });
      setIsEnriching(false);
    }
  };

  const executeBulkEnrichment = async () => {
    setIsEnriching(true);
    setEnrichProgress({ current: 0, total: selectedIds.length });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < selectedIds.length; i++) {
      const companyId = selectedIds[i];
      setEnrichProgress({ current: i + 1, total: selectedIds.length });

      try {
        const { data, error } = await supabase.functions.invoke('enrich-company', {
          body: { companyId, deepEnrich: false, previewOnly: false }
        });

        if (error) {
          console.error(`Enrichment error for ${companyId}:`, error);
          throw error;
        }
        
        if (data?.error) {
          console.error(`Enrichment failed for ${companyId}:`, data.details || data.error);
          throw new Error(data.error);
        }
        
        successCount++;
      } catch (error) {
        console.error(`Error enriching company ${companyId}:`, error);
        failCount++;
      }

      // Small delay to avoid rate limiting
      if (i < selectedIds.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    setIsEnriching(false);
    setEnrichProgress({ current: 0, total: 0 });
    setShowEnrichConfirm(false);

    toast({
      title: 'Bulk Enrichment Complete',
      description: `${successCount} companies enriched successfully${failCount > 0 ? `, ${failCount} failed` : ''}`,
      variant: failCount > 0 ? 'destructive' : 'default'
    });

    onClearSelection();
    onActionComplete();
  };

  return (
    <>
      <div className="border-b border-border bg-accent/50 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
          >
            <X className="h-4 w-4 mr-2" />
            Clear selection
          </Button>
          <span className="text-sm font-medium">
            {selectedCount} {selectedCount === 1 ? "company" : "companies"} selected
          </span>
        </div>

        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkEnrich}
                    disabled={isEnriching || !canEnrich || roleLoading}
                  >
                    <Sparkles className={`h-4 w-4 mr-2 ${isEnriching ? 'animate-pulse' : ''}`} />
                    {isEnriching ? `Enriching ${enrichProgress.current}/${enrichProgress.total}...` : 'Enrich All'}
                  </Button>
                </div>
              </TooltipTrigger>
              {!canEnrich && !roleLoading && (
                <TooltipContent>
                  <p>Enrichment requires Admin or Sales Manager role</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Change Status
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleBulkStatusChange("Lead")}>
                Lead
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulkStatusChange("Contacted")}>
                Contacted
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulkStatusChange("Engaged")}>
                Engaged
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulkStatusChange("Pilot")}>
                Pilot
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulkStatusChange("Active")}>
                Active
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulkStatusChange("Inactive")}>
                Inactive
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulkStatusChange("Lost")}>
                Lost
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkEmail}
          >
            <Mail className="h-4 w-4 mr-2" />
            Email
          </Button>

          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedCount} {selectedCount === 1 ? "company" : "companies"}.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {bulkEnrichPreviews.length > 0 && (
        <EnrichmentConfirmDialog
          open={showEnrichConfirm}
          onOpenChange={setShowEnrichConfirm}
          onConfirm={executeBulkEnrichment}
          fieldsToOverwrite={bulkEnrichPreviews.reduce((acc, preview) => {
            Object.entries(preview.fieldsToOverwrite || {}).forEach(([field, value]) => {
              if (!acc[field]) acc[field] = value;
            });
            return acc;
          }, {})}
          fieldsEnriched={bulkEnrichPreviews[0]?.fieldsEnriched || []}
          isConfirming={isEnriching}
        />
      )}
    </>
  );
}
