import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Mail, Phone, Linkedin, Loader2, Plus, Calendar, Video, GraduationCap, MessageSquare } from 'lucide-react';
import { CompanySearchSelect } from '../opportunities/CompanySearchSelect';

interface Company {
  id: string;
  company_name: string;
  industry_type: string;
}

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  title: string | null;
  company_id: string;
}

type CommunicationType = 'email' | 'call_script' | 'linkedin_message' | 'phone' | 'meeting' | 'demo' | 'training';

interface NewCommunicationDialogProps {
  onSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  prefilledCompanyId?: string;
  prefilledContactId?: string;
  prefilledPreviousContext?: string;
  prefilledCommunicationType?: CommunicationType;
}

export function NewCommunicationDialog({ 
  onSuccess, 
  open: controlledOpen,
  onOpenChange,
  prefilledCompanyId,
  prefilledContactId,
  prefilledPreviousContext,
  prefilledCommunicationType
}: NewCommunicationDialogProps) {
  const { toast } = useToast();
  const [internalOpen, setInternalOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [opportunities, setOpportunities] = useState<any[]>([]);

  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string>('none');
  const [communicationType, setCommunicationType] = useState<CommunicationType>('email');
  const [businessContext, setBusinessContext] = useState('');
  const [outreachPrompt, setOutreachPrompt] = useState('');
  const [previousContext, setPreviousContext] = useState('');
  const [aiModel, setAiModel] = useState('google/gemini-2.5-flash');

  useEffect(() => {
    if (open) {
      loadCompanies();
      // Set prefilled values when dialog opens
      if (prefilledCompanyId) setSelectedCompanyId(prefilledCompanyId);
      if (prefilledContactId) setSelectedContactId(prefilledContactId);
      if (prefilledPreviousContext) setPreviousContext(prefilledPreviousContext);
      if (prefilledCommunicationType) setCommunicationType(prefilledCommunicationType);
    }
  }, [open, prefilledCompanyId, prefilledContactId, prefilledPreviousContext, prefilledCommunicationType]);

  useEffect(() => {
    if (selectedCompanyId) {
      loadContacts(selectedCompanyId);
      loadOpportunities(selectedCompanyId);
    } else {
      setContacts([]);
      setSelectedContactId('');
      setOpportunities([]);
      setSelectedOpportunityId('none');
    }
  }, [selectedCompanyId]);

  const loadCompanies = async () => {
    setLoadingCompanies(true);
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, company_name, industry_type')
        .order('company_name');

      if (error) throw error;
      setCompanies(data || []);
    } catch (error: any) {
      console.error('Error loading companies:', error);
      toast({
        title: 'Error',
        description: 'Failed to load companies',
        variant: 'destructive',
      });
    } finally {
      setLoadingCompanies(false);
    }
  };

  const loadContacts = async (companyId: string) => {
    setLoadingContacts(true);
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, title, company_id')
        .eq('company_id', companyId)
        .order('first_name');

      if (error) throw error;
      setContacts(data || []);
    } catch (error: any) {
      console.error('Error loading contacts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load contacts',
        variant: 'destructive',
      });
    } finally {
      setLoadingContacts(false);
    }
  };

  const loadOpportunities = async (companyId: string) => {
    try {
      const { data, error } = await supabase
        .from('opportunities')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOpportunities(data || []);
    } catch (error: any) {
      console.error('Error loading opportunities:', error);
    }
  };

  const handleGenerate = async () => {
    if (!selectedCompanyId) {
      toast({
        title: 'Company Required',
        description: 'Please select a company',
        variant: 'destructive',
      });
      return;
    }

    if (!outreachPrompt.trim()) {
      toast({
        title: 'Outreach Purpose Required',
        description: 'Please describe what you\'re reaching out about',
        variant: 'destructive',
      });
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-communication', {
        body: {
          companyId: selectedCompanyId,
          contactId: selectedContactId || null,
          opportunityId: selectedOpportunityId && selectedOpportunityId !== 'none' ? selectedOpportunityId : null,
          communicationType,
          businessContext: businessContext || null,
          outreachPrompt: outreachPrompt || null,
          previousContext: previousContext || null,
          aiModel,
        },
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `${getTypeLabel(communicationType)} generated successfully`,
      });

      setOpen(false);
      resetForm();
      onSuccess?.();
    } catch (error: any) {
      console.error('Error generating communication:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate communication',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const resetForm = () => {
    setSelectedCompanyId('');
    setSelectedContactId('');
    setSelectedOpportunityId('none');
    setCommunicationType('email');
    setBusinessContext('');
    setOutreachPrompt('');
    setPreviousContext('');
    setAiModel('google/gemini-2.5-flash');
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'call_script': return <Phone className="h-4 w-4" />;
      case 'linkedin_message': return <Linkedin className="h-4 w-4" />;
      case 'phone': return <Phone className="h-4 w-4" />;
      case 'meeting': return <Calendar className="h-4 w-4" />;
      case 'demo': return <Video className="h-4 w-4" />;
      case 'training': return <GraduationCap className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'email': return 'Email';
      case 'call_script': return 'Call Script';
      case 'linkedin_message': return 'LinkedIn Message';
      case 'phone': return 'Phone Call';
      case 'meeting': return 'Meeting';
      case 'demo': return 'Demo';
      case 'training': return 'Training';
      default: return type;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Communication
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate New Communication</DialogTitle>
          <DialogDescription>
            Select a company and contact to generate personalized communication
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Company Selection */}
          <div className="space-y-2">
            <Label htmlFor="company">Company *</Label>
            <CompanySearchSelect
              value={selectedCompanyId}
              onValueChange={setSelectedCompanyId}
            />
          </div>

          {/* Contact Selection */}
          <div className="space-y-2">
            <Label htmlFor="contact">Target Contact (Optional)</Label>
            <Select 
              value={selectedContactId} 
              onValueChange={setSelectedContactId} 
              disabled={!selectedCompanyId || loadingContacts}
            >
              <SelectTrigger id="contact">
                <SelectValue placeholder={
                  !selectedCompanyId 
                    ? "Select a company first" 
                    : loadingContacts 
                    ? "Loading contacts..." 
                    : "No specific contact (general communication)"
                } />
              </SelectTrigger>
              <SelectContent>
                {contacts.map((contact) => (
                  <SelectItem key={contact.id} value={contact.id}>
                    {contact.first_name} {contact.last_name}
                    {contact.title && ` - ${contact.title}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Select a specific contact to personalize the communication, or leave empty for general messaging
            </p>
          </div>

          {/* Opportunity Selection */}
          <div className="space-y-2">
            <Label htmlFor="opportunity">Link to Opportunity (Optional)</Label>
            <Select 
              value={selectedOpportunityId} 
              onValueChange={setSelectedOpportunityId}
              disabled={!selectedCompanyId}
            >
              <SelectTrigger id="opportunity">
                <SelectValue placeholder="No specific opportunity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None - General outreach</SelectItem>
                {opportunities.map((opp) => (
                  <SelectItem key={opp.id} value={opp.id}>
                    {opp.opportunity_name} ({opp.stage})
                    {opp.amount && ` - $${opp.amount}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Link this communication to track it with a specific opportunity
            </p>
          </div>

          {/* Communication Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Communication Type</Label>
            <Select value={communicationType} onValueChange={(value: any) => setCommunicationType(value)}>
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span>Email</span>
                  </div>
                </SelectItem>
                <SelectItem value="call_script">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <span>Call Script</span>
                  </div>
                </SelectItem>
                <SelectItem value="linkedin_message">
                  <div className="flex items-center gap-2">
                    <Linkedin className="h-4 w-4" />
                    <span>LinkedIn Message</span>
                  </div>
                </SelectItem>
                <SelectItem value="phone">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <span>Phone Call</span>
                  </div>
                </SelectItem>
                <SelectItem value="meeting">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Meeting</span>
                  </div>
                </SelectItem>
                <SelectItem value="demo">
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4" />
                    <span>Demo</span>
                  </div>
                </SelectItem>
                <SelectItem value="training">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" />
                    <span>Training</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Business Context */}
          <div className="space-y-2">
            <Label htmlFor="business-context">Your Business Context (Optional but Recommended)</Label>
            <Textarea
              id="business-context"
              placeholder="Example: We are Google Nest Pro representatives offering smart home solutions to builders and contractors. Our goal is to establish partnerships and help integrate Nest products into their projects..."
              value={businessContext}
              onChange={(e) => setBusinessContext(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Describe your business, what you offer, and your relationship goals to help the AI generate more accurate communications
            </p>
          </div>

          {/* Outreach Purpose Prompt */}
          <div className="space-y-2">
            <Label htmlFor="prompt">What are you reaching out about? *</Label>
            <Textarea
              id="prompt"
              placeholder="Example: Introducing our new smart thermostat installation program for builders, or Following up on our previous conversation about partnership opportunities..."
              value={outreachPrompt}
              onChange={(e) => setOutreachPrompt(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Describe the purpose and key points of your outreach to generate a focused message
            </p>
          </div>

          {/* AI Model Selection */}
          <div className="space-y-2">
            <Label htmlFor="model">AI Model</Label>
            <Select value={aiModel} onValueChange={setAiModel}>
              <SelectTrigger id="model">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="google/gemini-2.5-flash">Gemini 2.5 Flash (Recommended)</SelectItem>
                <SelectItem value="google/gemini-2.5-pro">Gemini 2.5 Pro (Best Quality)</SelectItem>
                <SelectItem value="openai/gpt-5-mini">GPT-5 Mini</SelectItem>
                <SelectItem value="openai/gpt-5">GPT-5</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Previous Context */}
          <div className="space-y-2">
            <Label htmlFor="context">Previous Context (Optional)</Label>
            <Textarea
              id="context"
              placeholder="Add any previous communication context to help personalize the message..."
              value={previousContext}
              onChange={(e) => setPreviousContext(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Include any relevant conversation history, notes, or specific requirements
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={generating}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={generating || !selectedCompanyId || !outreachPrompt.trim()}>
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                {getTypeIcon(communicationType)}
                <span className="ml-2">Generate {getTypeLabel(communicationType)}</span>
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
