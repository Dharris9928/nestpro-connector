import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { CompanySearchSelect } from "./CompanySearchSelect";
import { UnifiedAssignmentSelect } from "../companies/UnifiedAssignmentSelect";
import { ContractorSearchSelect } from "./ContractorSearchSelect";
import { ContactMultiSelect } from "@/components/common/ContactMultiSelect";

interface EditOpportunityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunity: any;
}

export function EditOpportunityDialog({ open, onOpenChange, opportunity }: EditOpportunityDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    company_id: "",
    opportunity_name: "",
    stage: "Open",
    amount: "",
    expected_close_date: "",
    confidence: "",
    unit_needed_date: "",
    assigned_to: "",
    contractor_id: "",
    notes: "",
  });

  // Fetch contacts for the selected company
  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts-for-opportunity-edit', formData.company_id],
    queryFn: async () => {
      if (!formData.company_id) return [];
      const { data, error } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, title')
        .eq('company_id', formData.company_id)
        .order('first_name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!formData.company_id,
  });

  // Fetch existing contact associations
  const { data: existingContacts = [] } = useQuery({
    queryKey: ['opportunity-contacts', opportunity?.id],
    queryFn: async () => {
      if (!opportunity?.id) return [];
      const { data, error } = await supabase
        .from('opportunity_contacts')
        .select('contact_id')
        .eq('opportunity_id', opportunity.id);
      if (error) throw error;
      return data.map(oc => oc.contact_id);
    },
    enabled: !!opportunity?.id && open,
  });

  // Initialize form data when opportunity changes
  useEffect(() => {
    if (opportunity && open) {
      setFormData({
        company_id: opportunity.company_id || "",
        opportunity_name: opportunity.opportunity_name || "",
        stage: opportunity.stage || "Open",
        amount: opportunity.amount ? String(opportunity.amount) : "",
        expected_close_date: opportunity.expected_close_date || "",
        confidence: opportunity.confidence ? String(opportunity.confidence) : "",
        unit_needed_date: opportunity.unit_needed_date || "",
        assigned_to: opportunity.assigned_to || "unassigned",
        contractor_id: opportunity.contractor_id || "",
        notes: opportunity.notes || "",
      });
      setSelectedContactIds(existingContacts);
    }
  }, [opportunity, open, existingContacts]);

  const updateOpportunity = useMutation({
    mutationFn: async () => {
      // Update opportunity
      const { error } = await supabase
        .from('opportunities' as any)
        .update({
          company_id: formData.company_id,
          opportunity_name: formData.opportunity_name,
          stage: formData.stage,
          amount: formData.amount ? parseFloat(formData.amount) : null,
          expected_close_date: formData.expected_close_date || null,
          confidence: formData.confidence ? parseInt(formData.confidence) : null,
          unit_needed_date: formData.unit_needed_date || null,
          assigned_to: formData.assigned_to === "unassigned" ? null : (formData.assigned_to || null),
          contractor_id: formData.contractor_id || null,
          notes: formData.notes || null,
        })
        .eq('id', opportunity.id);

      if (error) throw error;

      // Delete existing contact associations
      const { error: deleteError } = await supabase
        .from('opportunity_contacts')
        .delete()
        .eq('opportunity_id', opportunity.id);

      if (deleteError) throw deleteError;

      // Create new contact associations
      if (selectedContactIds.length > 0) {
        const { error: insertError } = await supabase
          .from('opportunity_contacts')
          .insert(
            selectedContactIds.map(contactId => ({
              opportunity_id: opportunity.id,
              contact_id: contactId,
            }))
          );

        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      toast({
        title: "Success",
        description: "Opportunity updated successfully",
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update opportunity: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateOpportunity.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Opportunity</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="company_id">Company *</Label>
            <CompanySearchSelect
              value={formData.company_id}
              onValueChange={(value) => setFormData({ ...formData, company_id: value })}
            />
          </div>

          <div>
            <Label htmlFor="opportunity_name">Opportunity Name *</Label>
            <Input
              id="opportunity_name"
              value={formData.opportunity_name}
              onChange={(e) => setFormData({ ...formData, opportunity_name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="stage">Status *</Label>
              <Select value={formData.stage} onValueChange={(value) => setFormData({ ...formData, stage: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Open">Open</SelectItem>
                  <SelectItem value="Proposal">Proposal</SelectItem>
                  <SelectItem value="Committed">Committed</SelectItem>
                  <SelectItem value="Purchased">Purchased</SelectItem>
                  <SelectItem value="Declined">Declined</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="assigned_to">Assigned To</Label>
              <UnifiedAssignmentSelect
                value={formData.assigned_to}
                onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}
                rawIds={true}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="contractor_id">Contractor (Optional)</Label>
            <ContractorSearchSelect
              value={formData.contractor_id}
              onValueChange={(value) => setFormData({ ...formData, contractor_id: value })}
            />
          </div>

          {/* Contacts */}
          {formData.company_id && (
            <div className="space-y-2">
              <Label>Contacts (Optional)</Label>
              <ContactMultiSelect
                contacts={contacts}
                selectedContactIds={selectedContactIds}
                onSelectedContactsChange={setSelectedContactIds}
                placeholder="Select contacts..."
              />
              <p className="text-xs text-muted-foreground">
                Link contacts to this opportunity for tracking
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount">
                Estimated Value ($) <span className="text-muted-foreground font-normal">(Optional)</span>
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="15000"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="confidence">Confidence</Label>
              <Select 
                value={formData.confidence} 
                onValueChange={(value) => setFormData({ ...formData, confidence: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select confidence..." />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 21 }, (_, i) => i * 5).map((value) => (
                    <SelectItem key={value} value={String(value)}>
                      {value}%
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="expected_close_date">Expected Close Date</Label>
              <Input
                id="expected_close_date"
                type="date"
                value={formData.expected_close_date}
                onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="unit_needed_date">Unit Needed Date</Label>
              <Input
                id="unit_needed_date"
                type="date"
                value={formData.unit_needed_date}
                onChange={(e) => setFormData({ ...formData, unit_needed_date: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional information about this opportunity..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateOpportunity.isPending}>
              {updateOpportunity.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}