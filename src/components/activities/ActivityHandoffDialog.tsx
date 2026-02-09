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

interface Activity {
  id: string;
  company_id: string;
  contact_id?: string | null;
  activity_type: string;
  subject_line?: string | null;
  companies?: {
    company_name: string;
  };
}

interface ActivityHandoffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity: Activity | null;
  onSuccess?: () => void;
}

export function ActivityHandoffDialog({
  open,
  onOpenChange,
  activity,
  onSuccess,
}: ActivityHandoffDialogProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [notes, setNotes] = useState('');

  if (!activity) return null;

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
      let actualUserId = assignedTo;
      let isSalesRep = false;
      if (assignedTo.startsWith('user:')) {
        actualUserId = assignedTo.replace('user:', '');
      } else if (assignedTo.startsWith('salesrep:')) {
        actualUserId = assignedTo.replace('salesrep:', '');
        isSalesRep = true;
      }

      // Update the activity with handoff notes
      const updateData: any = {
        outcome: 'Completed',
        completed_date: new Date().toISOString().split('T')[0],
      };
      
      if (notes) {
        updateData.notes = `Handed off to team member.\n\nHandoff Notes: ${notes}`;
      } else {
        updateData.notes = 'Handed off to team member.';
      }

      const { error: activityError } = await supabase
        .from('outreach_activities')
        .update(updateData)
        .eq('id', activity.id);

      if (activityError) throw activityError;

      // Check if there's an existing opportunity for this company
      const { data: existingOpportunity } = await supabase
        .from('opportunities')
        .select('id')
        .eq('company_id', activity.company_id)
        .maybeSingle();

      // Only set assigned_to for profile users (not external sales reps)
      const assignmentData = isSalesRep
        ? {} 
        : { assigned_to: actualUserId };

      if (existingOpportunity) {
        // Update the existing opportunity's assigned_to
        if (!isSalesRep) {
          await supabase
            .from('opportunities')
            .update({ assigned_to: actualUserId })
            .eq('id', existingOpportunity.id);
        }
      } else {
        // Create a new opportunity for tracking
        await supabase
          .from('opportunities')
          .insert([{
            company_id: activity.company_id,
            ...assignmentData,
            stage: 'qualification',
            opportunity_name: `Lead from ${activity.activity_type}: ${activity.companies?.company_name || 'Unknown'}`,
            created_by: user.id,
          }]);
      }

      // Send notification to the assignee
      await supabase
        .from('notifications')
        .insert({
          user_id: actualUserId,
          title: 'New Activity Handoff',
          message: `You've been assigned an activity for ${activity.companies?.company_name || 'a company'}${activity.subject_line ? `: ${activity.subject_line}` : ''}`,
          type: 'handoff',
          link: '/activities',
          read: false,
        });

      toast({
        title: 'Handoff Complete',
        description: 'Activity has been handed off successfully',
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
            Hand Off Activity
          </DialogTitle>
          <DialogDescription>
            Assign this activity to a team member for follow-up
            {activity.companies?.company_name && (
              <span className="block mt-1 font-medium text-foreground">
                Company: {activity.companies.company_name}
              </span>
            )}
            {activity.subject_line && (
              <span className="block text-sm">
                {activity.activity_type}: {activity.subject_line}
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