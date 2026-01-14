import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Loader2 } from 'lucide-react';
import { CompanySearchSelect } from '@/components/opportunities/CompanySearchSelect';

interface AddCommunicationDialogProps {
  onSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

type CommunicationType = 'email' | 'call_script' | 'linkedin_message' | 'phone' | 'meeting' | 'demo' | 'training' | 'other';

export function AddCommunicationDialog({ onSuccess, open, onOpenChange }: AddCommunicationDialogProps) {
  const { toast } = useToast();
  const [internalOpen, setInternalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    company_id: '',
    contact_id: '',
    communication_type: 'email' as CommunicationType,
    subject: '',
    content: '',
    notes: '',
  });

  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;

  // Fetch contacts for selected company
  const { data: contacts } = useQuery({
    queryKey: ['contacts-for-company', formData.company_id],
    queryFn: async () => {
      if (!formData.company_id) return [];
      const { data, error } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, title, email')
        .eq('company_id', formData.company_id)
        .order('first_name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!formData.company_id,
  });

  // Reset contact when company changes
  useEffect(() => {
    setFormData(prev => ({ ...prev, contact_id: '' }));
  }, [formData.company_id]);

  const resetForm = () => {
    setFormData({
      company_id: '',
      contact_id: '',
      communication_type: 'email',
      subject: '',
      content: '',
      notes: '',
    });
  };

  const handleSave = async () => {
    if (!formData.company_id || !formData.content) {
      toast({
        title: 'Missing fields',
        description: 'Company and content are required',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('company_communications')
        .insert({
          company_id: formData.company_id,
          contact_id: formData.contact_id || null,
          communication_type: formData.communication_type,
          subject: formData.subject || null,
          content: formData.content,
          notes: formData.notes || null,
          user_id: user.id,
          generated_at: new Date().toISOString(),
          ai_model: null, // Manually created, not AI generated
        });

      if (error) throw error;

      toast({
        title: 'Communication Added',
        description: 'Your communication has been saved successfully',
      });

      resetForm();
      setIsOpen(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error saving communication:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save communication',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Add Manual
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Communication</DialogTitle>
          <DialogDescription>
            Manually add a communication record (non-AI generated)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Company Selection */}
          <div className="space-y-2">
            <Label>Company *</Label>
            <CompanySearchSelect
              value={formData.company_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, company_id: value }))}
            />
          </div>

          {/* Contact Selection */}
          <div className="space-y-2">
            <Label>Contact</Label>
            <Select 
              value={formData.contact_id} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, contact_id: value }))}
              disabled={!formData.company_id}
            >
              <SelectTrigger>
                <SelectValue placeholder={formData.company_id ? "Select a contact (optional)" : "Select a company first"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No contact</SelectItem>
                {contacts?.map((contact) => (
                  <SelectItem key={contact.id} value={contact.id}>
                    {contact.first_name} {contact.last_name}
                    {contact.title && ` - ${contact.title}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Communication Type */}
          <div className="space-y-2">
            <Label>Communication Type *</Label>
            <Select 
              value={formData.communication_type} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, communication_type: value as CommunicationType }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="call_script">Call Script</SelectItem>
                <SelectItem value="linkedin_message">LinkedIn Message</SelectItem>
                <SelectItem value="phone">Phone Call</SelectItem>
                <SelectItem value="meeting">Meeting</SelectItem>
                <SelectItem value="demo">Demo</SelectItem>
                <SelectItem value="training">Training</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label>Subject</Label>
            <Input
              placeholder="Enter subject line..."
              value={formData.subject}
              onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
            />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label>Content *</Label>
            <Textarea
              placeholder="Enter communication content..."
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              rows={8}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              placeholder="Any additional notes..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !formData.company_id || !formData.content}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Communication
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
