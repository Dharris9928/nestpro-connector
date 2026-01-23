import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, Phone, Linkedin, Loader2, Plus, Calendar, Video, GraduationCap, MessageSquare, Sparkles, PenLine } from 'lucide-react';
import { CompanySearchSelect } from '../opportunities/CompanySearchSelect';
import { ContactMultiSelect } from '@/components/common/ContactMultiSelect';

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
type InputMode = 'ai' | 'manual';

interface NewCommunicationDialogProps {
  onSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  prefilledCompanyId?: string;
  prefilledContactId?: string;
  prefilledPreviousContext?: string;
  prefilledCommunicationType?: CommunicationType;
  defaultMode?: InputMode;
}

export function NewCommunicationDialog({ 
  onSuccess, 
  open: controlledOpen,
  onOpenChange,
  prefilledCompanyId,
  prefilledContactId,
  prefilledPreviousContext,
  prefilledCommunicationType,
  defaultMode = 'ai'
}: NewCommunicationDialogProps) {
  const { toast } = useToast();
  const [internalOpen, setInternalOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [opportunities, setOpportunities] = useState<any[]>([]);

  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  const [inputMode, setInputMode] = useState<InputMode>(defaultMode);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string>('none');
  const [communicationType, setCommunicationType] = useState<CommunicationType>('email');
  const [businessContext, setBusinessContext] = useState('');
  const [outreachPrompt, setOutreachPrompt] = useState('');
  const [previousContext, setPreviousContext] = useState('');
  const [aiModel, setAiModel] = useState('google/gemini-2.5-flash');
  
  // Manual input fields
  const [manualSubject, setManualSubject] = useState('');
  const [manualContent, setManualContent] = useState('');
  const [manualNotes, setManualNotes] = useState('');

  useEffect(() => {
    if (open) {
      loadCompanies();
      // Set prefilled values when dialog opens
      if (prefilledCompanyId) setSelectedCompanyId(prefilledCompanyId);
      if (prefilledContactId) setSelectedContactIds([prefilledContactId]);
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
      setSelectedContactIds([]);
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
          contactIds: selectedContactIds.length > 0 ? selectedContactIds : null,
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

  const handleManualSave = async () => {
    if (!selectedCompanyId) {
      toast({
        title: 'Company Required',
        description: 'Please select a company',
        variant: 'destructive',
      });
      return;
    }

    if (!manualContent.trim()) {
      toast({
        title: 'Content Required',
        description: 'Please enter the communication content',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const now = new Date().toISOString();
      const { error } = await supabase
        .from('company_communications')
        .insert({
          company_id: selectedCompanyId,
          contact_id: selectedContactIds.length > 0 ? selectedContactIds[0] : null,
          opportunity_id: selectedOpportunityId && selectedOpportunityId !== 'none' ? selectedOpportunityId : null,
          communication_type: communicationType,
          subject: manualSubject || null,
          content: manualContent,
          notes: manualNotes || null,
          user_id: user.id,
          generated_at: now,
          sent_at: now,
          ai_model: null, // Manually created, not AI generated
        });

      if (error) throw error;

      toast({
        title: 'Communication Added',
        description: `${getTypeLabel(communicationType)} saved successfully`,
      });

      setOpen(false);
      resetForm();
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

  const resetForm = () => {
    setSelectedCompanyId('');
    setSelectedContactIds([]);
    setSelectedOpportunityId('none');
    setCommunicationType('email');
    setBusinessContext('');
    setOutreachPrompt('');
    setPreviousContext('');
    setAiModel('google/gemini-2.5-flash');
    setManualSubject('');
    setManualContent('');
    setManualNotes('');
    setInputMode(defaultMode);
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

  const isProcessing = generating || saving;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {inputMode === 'ai' ? 'Generate New Communication' : 'Add Communication'}
          </DialogTitle>
          <DialogDescription>
            {inputMode === 'ai' 
              ? 'Select a company and contact to generate personalized communication'
              : 'Manually add a communication record'
            }
          </DialogDescription>
        </DialogHeader>

        {/* Mode Toggle */}
        <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as InputMode)} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="ai" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Generate with AI
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <PenLine className="h-4 w-4" />
              Manual Input
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-4 py-4">
          {/* Company Selection - Common to both modes */}
          <div className="space-y-2">
            <Label htmlFor="company">Company *</Label>
            <CompanySearchSelect
              value={selectedCompanyId}
              onValueChange={setSelectedCompanyId}
            />
          </div>

          {/* Contact Selection - Common to both modes */}
          <div className="space-y-2">
            <Label htmlFor="contact">Target Contact{inputMode === 'ai' ? 's' : ''} (Optional)</Label>
            <ContactMultiSelect
              contacts={contacts}
              selectedContactIds={selectedContactIds}
              onSelectedContactsChange={setSelectedContactIds}
              disabled={!selectedCompanyId || loadingContacts}
              placeholder={
                !selectedCompanyId 
                  ? "Select a company first" 
                  : loadingContacts 
                  ? "Loading contacts..." 
                  : "Select contacts..."
              }
            />
            <p className="text-xs text-muted-foreground">
              {inputMode === 'ai' 
                ? 'Select specific contacts to personalize the communication, or leave empty for general messaging'
                : 'Select a contact to associate with this communication'
              }
            </p>
          </div>

          {/* Opportunity Selection - Common to both modes */}
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

          {/* Communication Type - Common to both modes */}
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

          {/* AI Mode Fields */}
          {inputMode === 'ai' && (
            <>
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
            </>
          )}

          {/* Manual Mode Fields */}
          {inputMode === 'manual' && (
            <>
              {/* Subject */}
              <div className="space-y-2">
                <Label htmlFor="manual-subject">Subject</Label>
                <Input
                  id="manual-subject"
                  placeholder="Email subject or communication title..."
                  value={manualSubject}
                  onChange={(e) => setManualSubject(e.target.value)}
                />
              </div>

              {/* Content */}
              <div className="space-y-2">
                <Label htmlFor="manual-content">Content *</Label>
                <Textarea
                  id="manual-content"
                  placeholder="Enter the full content of the communication..."
                  value={manualContent}
                  onChange={(e) => setManualContent(e.target.value)}
                  rows={8}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Enter the complete message, email body, or call notes
                </p>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="manual-notes">Internal Notes (Optional)</Label>
                <Textarea
                  id="manual-notes"
                  placeholder="Add any internal notes about this communication..."
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Notes visible only to your team, not part of the communication
                </p>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isProcessing}>
            Cancel
          </Button>
          
          {inputMode === 'ai' ? (
            <Button 
              onClick={handleGenerate} 
              disabled={isProcessing || !selectedCompanyId || !outreachPrompt.trim()}
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate {getTypeLabel(communicationType)}
                </>
              )}
            </Button>
          ) : (
            <Button 
              onClick={handleManualSave} 
              disabled={isProcessing || !selectedCompanyId || !manualContent.trim()}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  {getTypeIcon(communicationType)}
                  <span className="ml-2">Save {getTypeLabel(communicationType)}</span>
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
