import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, Phone, Linkedin, Loader2, Copy, Check, Trash2, ExternalLink, User, Reply, Calendar, Video, GraduationCap, MessageSquare, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { EditCommunicationDialog } from './EditCommunicationDialog';

interface Communication {
  id: string;
  communication_type: string;
  subject: string | null;
  content: string;
  previous_context: string | null;
  ai_model: string | null;
  generated_at: string;
  used: boolean;
  sent_at: string | null;
  attempted_at: string | null;
  notes: string | null;
  contact_id: string | null;
  conversation_active: boolean | null;
  contacts?: {
    first_name: string;
    last_name: string;
    title: string | null;
    email: string | null;
  };
  opportunities?: {
    opportunity_name: string;
    stage: string;
  };
}

interface CommunicationsTabProps {
  companyId: string;
}

export function CommunicationsTab({ companyId }: CommunicationsTabProps) {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<'email' | 'call_script' | 'linkedin_message' | 'phone' | 'meeting' | 'demo' | 'training'>('email');
  const [previousContext, setPreviousContext] = useState('');
  const [aiModel, setAiModel] = useState('google/gemini-2.5-flash');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [contacts, setContacts] = useState<any[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string>('none');
  const generatorRef = useRef<HTMLDivElement>(null);
  const [editCommunication, setEditCommunication] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    if (companyId) {
      loadCommunications();
      loadContacts();
      loadOpportunities();
    }
  }, [companyId]);

  const loadContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('company_id', companyId)
        .order('first_name');

      if (error) throw error;
      setContacts(data || []);
    } catch (error: any) {
      console.error('Error loading contacts:', error);
    }
  };

  const loadOpportunities = async () => {
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

  const loadCommunications = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('company_communications')
        .select(`
          *,
          contacts(
            first_name,
            last_name,
            title,
            email
          ),
          opportunities(
            opportunity_name,
            stage
          )
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCommunications(data || []);
    } catch (error: any) {
      console.error('Error loading communications:', error);
      toast({
        title: 'Error',
        description: 'Failed to load communication history',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('generate-communication', {
        body: {
          companyId,
          communicationType: selectedType,
          previousContext: previousContext.trim() || null,
          aiModel,
          contactId: selectedContactId || null,
          opportunityId: selectedOpportunityId && selectedOpportunityId !== 'none' ? selectedOpportunityId : null,
        },
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `${selectedType === 'email' ? 'Email' : selectedType === 'call_script' ? 'Call script' : 'LinkedIn message'} generated successfully`,
      });

      await loadCommunications();
      setPreviousContext('');
      setSelectedContactId('');
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

  const handleCopy = async (id: string, content: string, subject?: string) => {
    const textToCopy = subject ? `${subject}\n\n${content}` : content;
    await navigator.clipboard.writeText(textToCopy);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({
      title: 'Copied',
      description: 'Content copied to clipboard',
    });
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('company_communications')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Deleted',
        description: 'Communication deleted successfully',
      });

      await loadCommunications();
    } catch (error: any) {
      console.error('Error deleting communication:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete communication',
        variant: 'destructive',
      });
    }
  };

  const handleMarkAsUsed = async (id: string) => {
    try {
      const { error } = await supabase
        .from('company_communications')
        .update({ 
          used: true, 
          sent_at: new Date().toISOString(),
          attempted_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Updated',
        description: 'Communication marked as used',
      });

      await loadCommunications();
    } catch (error: any) {
      console.error('Error updating communication:', error);
      toast({
        title: 'Error',
        description: 'Failed to update communication',
        variant: 'destructive',
      });
    }
  };

  const handleToggleConversationStatus = async (id: string, currentStatus: boolean | null) => {
    try {
      const newStatus = !currentStatus;
      const { error } = await supabase
        .from('company_communications')
        .update({ conversation_active: newStatus })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Updated',
        description: `Conversation marked as ${newStatus ? 'active' : 'inactive'}`,
      });

      await loadCommunications();
    } catch (error: any) {
      console.error('Error updating conversation status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update conversation status',
        variant: 'destructive',
      });
    }
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

  const handleReply = (comm: Communication) => {
    // Build context from the communication being replied to
    const contextText = `Previous ${getTypeLabel(comm.communication_type)}${comm.subject ? ` - "${comm.subject}"` : ''}:\n${comm.content}${comm.notes ? `\n\nNotes: ${comm.notes}` : ''}`;
    
    setPreviousContext(contextText);
    setSelectedType(comm.communication_type as 'email' | 'call_script' | 'linkedin_message' | 'phone' | 'meeting' | 'demo' | 'training');
    if (comm.contact_id) {
      setSelectedContactId(comm.contact_id);
    }
    
    // Scroll to generator
    generatorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    toast({
      title: 'Reply Mode',
      description: 'Form pre-filled with context from previous communication',
    });
  };

  const handleEdit = (comm: Communication) => {
    setEditCommunication(comm);
    setIsEditDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <Card ref={generatorRef}>
        <CardHeader>
          <CardTitle>AI Communication Generator</CardTitle>
          <CardDescription>
            Generate personalized emails, call scripts, and LinkedIn messages based on company data and AI insights
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Communication Type</Label>
              <Select value={selectedType} onValueChange={(v: any) => setSelectedType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </div>
                  </SelectItem>
                  <SelectItem value="call_script">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Call Script
                    </div>
                  </SelectItem>
                  <SelectItem value="linkedin_message">
                    <div className="flex items-center gap-2">
                      <Linkedin className="h-4 w-4" />
                      LinkedIn Message
                    </div>
                  </SelectItem>
                  <SelectItem value="phone">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Phone Call
                    </div>
                  </SelectItem>
                  <SelectItem value="meeting">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Meeting
                    </div>
                  </SelectItem>
                  <SelectItem value="demo">
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4" />
                      Demo
                    </div>
                  </SelectItem>
                  <SelectItem value="training">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4" />
                      Training
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>AI Model</Label>
              <Select value={aiModel} onValueChange={setAiModel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="google/gemini-2.5-flash">Gemini 2.5 Flash (Recommended)</SelectItem>
                  <SelectItem value="google/gemini-2.5-pro">Gemini 2.5 Pro (Advanced)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Target Contact (Optional)</Label>
            <Select value={selectedContactId} onValueChange={setSelectedContactId}>
              <SelectTrigger>
                <SelectValue placeholder="No specific contact (general communication)" />
              </SelectTrigger>
              <SelectContent>
                {contacts.map((contact) => (
                  <SelectItem key={contact.id} value={contact.id}>
                    {contact.first_name} {contact.last_name}
                    {contact.title && ` - ${contact.title}`}
                    {contact.decision_tier && ` (${contact.decision_tier})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Select a specific contact to personalize the communication, or leave empty for general messaging
            </p>
          </div>

          <div>
            <Label>Link to Opportunity (Optional)</Label>
            <Select value={selectedOpportunityId} onValueChange={setSelectedOpportunityId}>
              <SelectTrigger>
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
            <p className="text-xs text-muted-foreground mt-1">
              Link this communication to a specific opportunity for better tracking and AI learning
            </p>
          </div>

          <div>
            <Label>Previous Communication Context (Optional)</Label>
            <Textarea
              placeholder="Add context from previous communications to help the AI generate more relevant content..."
              value={previousContext}
              onChange={(e) => setPreviousContext(e.target.value)}
              rows={3}
            />
          </div>

          <Button 
            onClick={handleGenerate} 
            disabled={generating}
            className="w-full"
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                {getTypeIcon(selectedType)}
                <span className="ml-2">Generate {getTypeLabel(selectedType)}</span>
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Communication History</CardTitle>
          <CardDescription>
            View and manage previously generated communications
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : communications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No communications generated yet. Create your first one above!
            </div>
          ) : (
            <Tabs defaultValue="all" className="w-full">
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="email">Emails</TabsTrigger>
                <TabsTrigger value="call_script">Call Scripts</TabsTrigger>
                <TabsTrigger value="linkedin_message">LinkedIn</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-4 mt-4">
                {communications.map((comm) => (
                  <Card key={comm.id} className={comm.used ? 'opacity-60' : ''}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {getTypeIcon(comm.communication_type)}
                            <CardTitle className="text-base">{getTypeLabel(comm.communication_type)}</CardTitle>
                            {comm.used && <Badge variant="secondary">Used</Badge>}
                            <Badge variant={comm.conversation_active !== false ? "default" : "secondary"}>
                              {comm.conversation_active !== false ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          {comm.contacts && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <User className="h-4 w-4" />
                              <span>
                                To: {comm.contacts.first_name} {comm.contacts.last_name}
                                {comm.contacts.title && ` - ${comm.contacts.title}`}
                              </span>
                            </div>
                          )}
                          {comm.opportunities && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span className="font-medium">
                                Opportunity: {comm.opportunities.opportunity_name} ({comm.opportunities.stage})
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(comm)}
                            title="Edit this communication"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReply(comm)}
                            title="Reply or create follow-up"
                          >
                            <Reply className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopy(comm.id, comm.content, comm.subject || undefined)}
                          >
                            {copiedId === comm.id ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant={comm.conversation_active !== false ? "secondary" : "default"}
                            size="sm"
                            onClick={() => handleToggleConversationStatus(comm.id, comm.conversation_active ?? true)}
                            title={comm.conversation_active !== false ? "Mark as inactive" : "Mark as active"}
                          >
                            {comm.conversation_active !== false ? "Inactive" : "Active"}
                          </Button>
                          {!comm.used && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkAsUsed(comm.id)}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(comm.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {comm.subject && (
                        <CardDescription className="font-medium mt-2">
                          Subject: {comm.subject}
                        </CardDescription>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Generated: {format(new Date(comm.generated_at), 'MMM d, yyyy h:mm a')}</span>
                        {comm.attempted_at && (
                          <span>Attempted: {format(new Date(comm.attempted_at), 'MMM d, yyyy h:mm a')}</span>
                        )}
                        {comm.ai_model && <span>Model: {comm.ai_model}</span>}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="whitespace-pre-wrap text-sm bg-muted/30 p-4 rounded-md">
                        {comm.content}
                      </div>
                      {comm.previous_context && (
                        <div className="mt-3 pt-3 border-t">
                          <Label className="text-xs text-muted-foreground">Previous Context Used:</Label>
                          <p className="text-xs text-muted-foreground mt-1">{comm.previous_context}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              {['email', 'call_script', 'linkedin_message'].map((type) => (
                <TabsContent key={type} value={type} className="space-y-4 mt-4">
                  {communications
                    .filter((c) => c.communication_type === type)
                    .map((comm) => (
                      <Card key={comm.id} className={comm.used ? 'opacity-60' : ''}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                {getTypeIcon(comm.communication_type)}
                                <CardTitle className="text-base">{getTypeLabel(comm.communication_type)}</CardTitle>
                                {comm.used && <Badge variant="secondary">Used</Badge>}
                                <Badge variant={comm.conversation_active !== false ? "default" : "secondary"}>
                                  {comm.conversation_active !== false ? "Active" : "Inactive"}
                                </Badge>
                              </div>
                              {comm.contacts && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <User className="h-4 w-4" />
                                  <span>
                                    To: {comm.contacts.first_name} {comm.contacts.last_name}
                                    {comm.contacts.title && ` - ${comm.contacts.title}`}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopy(comm.id, comm.content, comm.subject || undefined)}
                              >
                                {copiedId === comm.id ? (
                                  <Check className="h-4 w-4" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant={comm.conversation_active !== false ? "secondary" : "default"}
                                size="sm"
                                onClick={() => handleToggleConversationStatus(comm.id, comm.conversation_active ?? true)}
                                title={comm.conversation_active !== false ? "Mark as inactive" : "Mark as active"}
                              >
                                {comm.conversation_active !== false ? "Inactive" : "Active"}
                              </Button>
                              {!comm.used && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleMarkAsUsed(comm.id)}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(comm.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          {comm.subject && (
                            <CardDescription className="font-medium mt-2">
                              Subject: {comm.subject}
                            </CardDescription>
                          )}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Generated: {format(new Date(comm.generated_at), 'MMM d, yyyy h:mm a')}</span>
                            {comm.attempted_at && (
                              <span>Attempted: {format(new Date(comm.attempted_at), 'MMM d, yyyy h:mm a')}</span>
                            )}
                            {comm.ai_model && <span>Model: {comm.ai_model}</span>}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="whitespace-pre-wrap text-sm bg-muted/30 p-4 rounded-md">
                            {comm.content}
                          </div>
                          {comm.previous_context && (
                            <div className="mt-3 pt-3 border-t">
                              <Label className="text-xs text-muted-foreground">Previous Context Used:</Label>
                              <p className="text-xs text-muted-foreground mt-1">{comm.previous_context}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                </TabsContent>
              ))}
            </Tabs>
          )}
        </CardContent>
      </Card>

      <EditCommunicationDialog
        communication={editCommunication}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSuccess={loadCommunications}
      />
    </div>
  );
}