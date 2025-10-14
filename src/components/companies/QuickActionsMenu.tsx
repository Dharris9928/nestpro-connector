import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MoreVertical, Edit, ExternalLink, Trash2, Mail, Phone, Copy, RefreshCw, CalendarPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
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
import { calculateLeadScore } from "@/lib/scoring/leadScoring";
import { AddActivityDialog } from "@/components/activities/AddActivityDialog";

interface QuickActionsMenuProps {
  company: any;
  onEdit: () => void;
  onDelete: () => void;
}

export function QuickActionsMenu({ company, onEdit, onDelete }: QuickActionsMenuProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showActivityDialog, setShowActivityDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const { toast } = useToast();

  const handleCopyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: `${label} copied to clipboard`,
    });
  };

  const handleRecalculateScore = async () => {
    setIsRecalculating(true);
    try {
      const scoring = await calculateLeadScore(company.id);
      
      toast({
        title: "Score Updated",
        description: `New score: ${scoring.totalScore}/100 (${scoring.priorityTier})`,
      });
      
      onDelete(); // Refresh the table
    } catch (error) {
      console.error("Error recalculating score:", error);
      toast({
        title: "Error",
        description: "Failed to calculate score",
        variant: "destructive",
      });
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("companies")
        .delete()
        .eq("id", company.id);

      if (error) throw error;

      toast({
        title: "Company Deleted",
        description: `${company.company_name} has been deleted`,
      });

      onDelete();
      setShowDeleteDialog(false);
    } catch (error) {
      console.error("Error deleting company:", error);
      toast({
        title: "Error",
        description: "Failed to delete company",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>More actions</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={onEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Details
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handleRecalculateScore} disabled={isRecalculating}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRecalculating ? 'animate-spin' : ''}`} />
            {isRecalculating ? 'Calculating...' : 'Recalculate Score'}
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => setShowActivityDialog(true)}>
            <CalendarPlus className="h-4 w-4 mr-2" />
            Log Activity
          </DropdownMenuItem>
          
          {company.website_url && (
            <DropdownMenuItem asChild>
              <a href={company.website_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Visit Website
              </a>
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          {company.primary_phone && (
            <DropdownMenuItem onClick={() => handleCopyToClipboard(company.primary_phone, "Phone number")}>
              <Phone className="h-4 w-4 mr-2" />
              Copy Phone
            </DropdownMenuItem>
          )}

          {company.website_url && (
            <DropdownMenuItem onClick={() => handleCopyToClipboard(company.website_url, "Website")}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Website
            </DropdownMenuItem>
          )}

          {company.linkedin_company_url && (
            <DropdownMenuItem onClick={() => handleCopyToClipboard(company.linkedin_company_url, "LinkedIn URL")}>
              <Copy className="h-4 w-4 mr-2" />
              Copy LinkedIn
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem 
            onClick={() => setShowDeleteDialog(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Company
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {company.company_name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this company and all associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AddActivityDialog
        open={showActivityDialog}
        onOpenChange={setShowActivityDialog}
        onSuccess={() => {
          setShowActivityDialog(false);
        }}
        companyId={company.id}
        companyName={company.company_name}
      />
    </>
  );
}
