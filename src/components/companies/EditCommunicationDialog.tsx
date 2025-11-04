import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface EditCommunicationDialogProps {
  communication: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditCommunicationDialog({ 
  communication, 
  open, 
  onOpenChange,
  onSuccess 
}: EditCommunicationDialogProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    communication_type: 'email' as 'email' | 'call_script' | 'linkedin_message' | 'phone' | 'meeting' | 'demo' | 'training',
    subject: '',
    content: '',
    email_opened_at: '',
    email_responded_at: '',
    notes: '',
    opportunity_id: 'none' as string,
  });

  // Fetch opportunities for the company
  const { data: opportunities = [] } = useQuery({
    queryKey: ['opportunities', communication?.company_id],
    queryFn: async () => {
      if (!communication?.company_id) return [];
      const { data, error } = await supabase
        .from('opportunities')
        .select('id, opportunity_name, stage')
        .eq('company_id', communication.company_id)
        .order('opportunity_name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!communication?.company_id && open,
  });

  useEffect(() => {
    if (communication && open) {
      // Format datetime for datetime-local input
      const formatDateTimeLocal = (dateStr: string | null) => {
        if (!dateStr) return "";
        const date = new Date(dateStr);
        return date.toISOString().slice(0, 16);
      };

      setFormData({
        communication_type: communication.communication_type || 'email',
        subject: communication.subject || '',
        content: communication.content || '',
        email_opened_at: formatDateTimeLocal(communication.email_opened_at),
        email_responded_at: formatDateTimeLocal(communication.email_responded_at),
        notes: communication.notes || '',
        opportunity_id: communication.opportunity_id || 'none',
      });
    }
  }, [communication, open]);

  const handleSave = async () => {
    if (!communication?.id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('company_communications')
        .update({
          communication_type: formData.communication_type,
          subject: formData.subject || null,
          content: formData.content,
          email_opened_at: formData.email_opened_at || null,
          email_responded_at: formData.email_responded_at || null,
          notes: formData.notes || null,
          opportunity_id: formData.opportunity_id === 'none' ? null : formData.opportunity_id,
        })
        .eq('id', communication.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Communication updated successfully',
      });

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error updating communication:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update communication',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (!communication) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Communication</DialogTitle>
          <DialogDescription>
            Update the details of this communication
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Communication Type */}
          <div className="space-y-2">
            <Label htmlFor="communication_type">Communication Type *</Label>
            <Select
              value={formData.communication_type}
              onValueChange={(value: any) =>
                setFormData(prev => ({ ...prev, communication_type: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="phone">Phone Call</SelectItem>
                <SelectItem value="call_script">Call Script</SelectItem>
                <SelectItem value="linkedin_message">LinkedIn Message</SelectItem>
                <SelectItem value="meeting">Meeting</SelectItem>
                <SelectItem value="demo">Demo</SelectItem>
                <SelectItem value="training">Training</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Opportunity */}
          <div className="space-y-2">
            <Label htmlFor="opportunity">Opportunity (Optional)</Label>
            <Select
              value={formData.opportunity_id}
              onValueChange={(value) =>
                setFormData(prev => ({ ...prev, opportunity_id: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select opportunity (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {opportunities.map((opp: any) => (
                  <SelectItem key={opp.id} value={opp.id}>
                    {opp.opportunity_name} ({opp.stage})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Subject Line */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject Line</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
              placeholder="Subject line"
            />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content">Content *</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              placeholder="Communication content"
              rows={10}
              className="resize-none font-mono text-sm"
            />
          </div>

          {/* Email Tracking - Only show for email type */}
          {formData.communication_type === 'email' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email_opened_at">Email Opened Date</Label>
                <Input
                  id="email_opened_at"
                  type="datetime-local"
                  value={formData.email_opened_at}
                  onChange={(e) => setFormData(prev => ({ ...prev, email_opened_at: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email_responded_at">Email Responded Date</Label>
                <Input
                  id="email_responded_at"
                  type="datetime-local"
                  value={formData.email_responded_at}
                  onChange={(e) => setFormData(prev => ({ ...prev, email_responded_at: e.target.value }))}
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes"
              rows={3}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !formData.content.trim()}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
