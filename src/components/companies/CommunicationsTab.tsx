import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, Phone, Linkedin, Loader2, Copy, Check, Trash2, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

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
  notes: string | null;
}

interface CommunicationsTabProps {
  companyId: string;
}

export function CommunicationsTab({ companyId }: CommunicationsTabProps) {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<'email' | 'call_script' | 'linkedin_message'>('email');
  const [previousContext, setPreviousContext] = useState('');
  const [aiModel, setAiModel] = useState('google/gemini-2.5-flash');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (companyId) {
      loadCommunications();
    }
  }, [companyId]);

  const loadCommunications = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('company_communications')
        .select('*')
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
        },
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `${selectedType === 'email' ? 'Email' : selectedType === 'call_script' ? 'Call script' : 'LinkedIn message'} generated successfully`,
      });

      await loadCommunications();
      setPreviousContext('');
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
        .update({ used: true, sent_at: new Date().toISOString() })
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'call_script': return <Phone className="h-4 w-4" />;
      case 'linkedin_message': return <Linkedin className="h-4 w-4" />;
      default: return null;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'email': return 'Email';
      case 'call_script': return 'Call Script';
      case 'linkedin_message': return 'LinkedIn Message';
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
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
                  <SelectItem value="openai/gpt-5-mini">GPT-5 Mini</SelectItem>
                  <SelectItem value="openai/gpt-5">GPT-5 (Premium)</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
                        <div className="flex items-center gap-2">
                          {getTypeIcon(comm.communication_type)}
                          <CardTitle className="text-base">{getTypeLabel(comm.communication_type)}</CardTitle>
                          {comm.used && <Badge variant="secondary">Used</Badge>}
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
                      <CardDescription className="text-xs">
                        Generated {format(new Date(comm.generated_at), 'MMM d, yyyy h:mm a')}
                        {comm.ai_model && ` • ${comm.ai_model}`}
                      </CardDescription>
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
                            <div className="flex items-center gap-2">
                              {getTypeIcon(comm.communication_type)}
                              <CardTitle className="text-base">{getTypeLabel(comm.communication_type)}</CardTitle>
                              {comm.used && <Badge variant="secondary">Used</Badge>}
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
                          <CardDescription className="text-xs">
                            Generated {format(new Date(comm.generated_at), 'MMM d, yyyy h:mm a')}
                            {comm.ai_model && ` • ${comm.ai_model}`}
                          </CardDescription>
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
    </div>
  );
}