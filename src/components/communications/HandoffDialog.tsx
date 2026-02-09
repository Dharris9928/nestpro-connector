import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Handshake } from 'lucide-react';
import { UnifiedAssignmentSelect } from '@/components/companies/UnifiedAssignmentSelect';

interface HandoffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communication: {
    id: string;
    company_id: string;
    contact_id?: string;
    subject?: string;
    companies?: { company_name: string };
  };
  onSuccess?: () => void;
}

export function HandoffDialog({
  open,
  onOpenChange,
  communication,
  onSuccess,
}: HandoffDialogProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [notes, setNotes] = useState('');

  const handleHandoff = async () => {
    if (!assignedTo || assignedTo === 'unassigned') {
      toast({
        title: 'Assignee Required',
        description: 'Please select someone to hand off to',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Parse the assignedTo value to get the actual user ID
      // Format is either "user:uuid" or "salesrep:uuid" or just "uuid"
      let actualUserId = assignedTo;
      let isSalesRep = false;
      if (assignedTo.startsWith('user:')) {
        actualUserId = assignedTo.replace('user:', '');
      } else if (assignedTo.startsWith('salesrep:')) {
        actualUserId = assignedTo.replace('salesrep:', '');
        isSalesRep = true;
      }

      // Update the communication - only set assigned_to for system users (profiles FK constraint)
      const updateData: Record<string, any> = {};
      if (!isSalesRep) {
        updateData.assigned_to = actualUserId;
      }
      if (notes) {
        updateData.notes = `Handoff Notes: ${notes}`;
      }

      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from('company_communications')
          .update(updateData)
          .eq('id', communication.id);

        if (updateError) throw updateError;
      }


      // Check if there's an existing opportunity for this company
      const { data: existingOpportunity } = await supabase
        .from('opportunities')
        .select('id')
        .eq('company_id', communication.company_id)
        .maybeSingle();

      if (existingOpportunity) {
        if (!isSalesRep) {
          await supabase
            .from('opportunities')
            .update({ assigned_to: actualUserId })
            .eq('id', existingOpportunity.id);
        }
      } else {
        // Create a new opportunity for tracking the handoff
        const assignmentData = isSalesRep ? {} : { assigned_to: actualUserId };
        await supabase
          .from('opportunities')
          .insert([{
            company_id: communication.company_id,
            ...assignmentData,
            stage: 'qualification',
            opportunity_name: `Handoff: ${communication.companies?.company_name || 'Unknown'}`,
            created_by: user.id,
          }]);
      }

      // Send notification to the assignee
      await supabase
        .from('notifications')
        .insert({
          user_id: actualUserId,
          title: 'New Communication Handoff',
          message: `You've been assigned a communication for ${communication.companies?.company_name || 'a company'}${communication.subject ? `: ${communication.subject}` : ''}`,
          type: 'handoff',
          link: '/communications',
          read: false,
        });

      toast({
        title: 'Handoff Complete',
        description: 'Communication has been assigned successfully',
      });

      onOpenChange(false);
      setAssignedTo('');
      setNotes('');
      onSuccess?.();
    } catch (error: any) {
      console.error('Error during handoff:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to complete handoff',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Handshake className="h-5 w-5 text-purple-600" />
            Handoff Communication
          </DialogTitle>
          <DialogDescription>
            Assign this communication to a team member for follow-up
            {communication.companies?.company_name && (
              <span className="block mt-1 font-medium text-foreground">
                Company: {communication.companies.company_name}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Assign To *</Label>
            <UnifiedAssignmentSelect
              value={assignedTo}
              onValueChange={setAssignedTo}
              placeholder="Select team member..."
            />
          </div>

          <div className="space-y-2">
            <Label>Handoff Notes (Optional)</Label>
            <Textarea
              placeholder="Add any context or instructions for the assignee..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleHandoff}
            disabled={saving || !assignedTo || assignedTo === 'unassigned'}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Handshake className="h-4 w-4 mr-2" />
            Complete Handoff
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}