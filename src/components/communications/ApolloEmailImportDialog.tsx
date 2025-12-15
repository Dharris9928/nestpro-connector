import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Mail, Building2, User, CheckCircle2, XCircle, Clock, Loader2, Download, RefreshCw, Eye, EyeOff, Filter, X } from 'lucide-react';
import { format, subDays } from 'date-fns';

interface ApolloEmailImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: () => void;
}

interface ApolloSequence {
  id: string;
  name: string;
  created_at: string;
  active: boolean;
  num_steps: number;
}

interface ApolloEmail {
  apolloId: string;
  sequenceId?: string;
  sequenceName?: string;
  stepPosition?: number;
  subject?: string;
  bodyText?: string;
  bodyHtml?: string;
  status?: string;
  rawStatus?: string;
  sentAt?: string;
  openedAt?: string;
  clickedAt?: string;
  repliedAt?: string;
  bouncedAt?: string;
  spamBlocked?: boolean;
  contact?: {
    apolloId: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    title?: string;
    companyName?: string;
    companyDomain?: string;
  };
  company?: {
    apolloId: string;
    name?: string;
    domain?: string;
  };
}

interface ImportResult {
  total: number;
  companiesCreated: number;
  contactsCreated: number;
  communicationsCreated: number;
  skipped: number;
  errors: string[];
}

type Step = 'config' | 'preview' | 'importing' | 'results';

type EmailStatus = 'all' | 'delivered' | 'not_opened' | 'opened' | 'clicked' | 'replied' | 'bounced' | 'spam_blocked' | 'unsubscribed';

const STATUS_OPTIONS: { value: EmailStatus; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'not_opened', label: 'Not Opened' },
  { value: 'opened', label: 'Opened' },
  { value: 'clicked', label: 'Clicked' },
  { value: 'replied', label: 'Replied' },
  { value: 'bounced', label: 'Bounced' },
  { value: 'unsubscribed', label: 'Unsubscribed' },
  { value: 'spam_blocked', label: 'Spam Blocked' },
];

// Map the normalized status from the API to our filter status
const getEmailStatus = (email: ApolloEmail): EmailStatus => {
  const status = (email.status || '').toLowerCase();
  if (status === 'bounced') return 'bounced';
  if (status === 'spam_blocked') return 'spam_blocked';
  if (status === 'unsubscribed') return 'unsubscribed';
  if (status === 'replied') return 'replied';
  if (status === 'clicked') return 'clicked';
  if (status === 'opened') return 'opened';
  if (status === 'delivered' || status === 'pending') return 'delivered';
  return 'delivered';
};

export function ApolloEmailImportDialog({ open, onOpenChange, onImportComplete }: ApolloEmailImportDialogProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('config');
  const [loading, setLoading] = useState(false);
  
  // Config state
  const [sequences, setSequences] = useState<ApolloSequence[]>([]);
  const [selectedSequence, setSelectedSequence] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  // Preview state
  const [emails, setEmails] = useState<ApolloEmail[]>([]);
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState<EmailStatus>('all');
  
  // Import state
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // Compute status counts
  const statusCounts = emails.reduce((acc, email) => {
    const status = getEmailStatus(email);
    acc[status] = (acc[status] || 0) + 1;
    // Track "not_opened" separately - emails that were delivered but not opened
    if (status === 'delivered') {
      acc['not_opened'] = (acc['not_opened'] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  // Filter emails based on status
  const filteredEmails = emails.filter(email => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'not_opened') {
      // Not opened means delivered but not opened, clicked, or replied
      const status = getEmailStatus(email);
      return status === 'delivered';
    }
    return getEmailStatus(email) === statusFilter;
  });

  // Fetch sequences on open
  useEffect(() => {
    if (open) {
      fetchSequences();
    } else {
      // Reset state when dialog closes
      setStep('config');
      setEmails([]);
      setSelectedEmails(new Set());
      setImportProgress(0);
      setImportResult(null);
      setStatusFilter('all');
    }
  }, [open]);

  const fetchSequences = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('apollo-email-import', {
        body: { action: 'fetch-sequences' }
      });

      if (error) throw error;
      setSequences(data.sequences || []);
    } catch (error) {
      console.error('Error fetching sequences:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch Apollo sequences',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchEmails = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('apollo-email-import', {
        body: {
          action: 'fetch-emails',
          dateFrom,
          dateTo,
          sequenceId: selectedSequence !== 'all' ? selectedSequence : undefined,
          perPage: 100
        }
      });

      if (error) throw error;
      
      const fetchedEmails = data.emails || [];
      setEmails(fetchedEmails);
      setTotalCount(data.totalCount || fetchedEmails.length);
      setSelectedEmails(new Set(fetchedEmails.map((e: ApolloEmail) => e.apolloId)));
      setStep('preview');
    } catch (error) {
      console.error('Error fetching emails:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch emails from Apollo',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleEmailSelection = (apolloId: string) => {
    const newSelection = new Set(selectedEmails);
    if (newSelection.has(apolloId)) {
      newSelection.delete(apolloId);
    } else {
      newSelection.add(apolloId);
    }
    setSelectedEmails(newSelection);
  };

  const selectAll = () => {
    setSelectedEmails(new Set(filteredEmails.map(e => e.apolloId)));
  };

  const deselectAll = () => {
    // Only deselect filtered emails
    const filteredIds = new Set(filteredEmails.map(e => e.apolloId));
    const newSelection = new Set([...selectedEmails].filter(id => !filteredIds.has(id)));
    setSelectedEmails(newSelection);
  };

  const selectByStatus = (status: EmailStatus) => {
    const emailsToSelect = emails.filter(email => {
      if (status === 'all') return true;
      if (status === 'not_opened') {
        return email.sentAt && !email.openedAt && !email.bouncedAt;
      }
      return getEmailStatus(email) === status;
    });
    setSelectedEmails(new Set(emailsToSelect.map(e => e.apolloId)));
  };

  const importEmails = async () => {
    setStep('importing');
    setImportProgress(0);

    const selectedEmailsList = emails.filter(e => selectedEmails.has(e.apolloId));
    const result: ImportResult = {
      total: selectedEmailsList.length,
      companiesCreated: 0,
      contactsCreated: 0,
      communicationsCreated: 0,
      skipped: 0,
      errors: []
    };

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: 'Error', description: 'Not authenticated', variant: 'destructive' });
      return;
    }

    // Track created companies and contacts to avoid duplicates
    const companyMap = new Map<string, string>(); // companyName -> companyId
    const contactMap = new Map<string, string>(); // contactEmail -> contactId

    for (let i = 0; i < selectedEmailsList.length; i++) {
      const email = selectedEmailsList[i];
      setImportProgress(Math.round(((i + 1) / selectedEmailsList.length) * 100));

      try {
        const companyName = email.contact?.companyName || email.company?.name;
        
        if (!companyName) {
          result.skipped++;
          result.errors.push(`Skipped email "${email.subject}" - no company name`);
          continue;
        }

        // Find or create company
        let companyId = companyMap.get(companyName.toLowerCase());
        
        if (!companyId) {
          // Check if company exists
          const { data: existingCompany } = await supabase
            .from('companies')
            .select('id')
            .ilike('company_name', companyName)
            .maybeSingle();

          if (existingCompany) {
            companyId = existingCompany.id;
          } else {
            // Create company
            const { data: newCompany, error: companyError } = await supabase
              .from('companies')
              .insert({
                company_name: companyName,
                website_url: email.contact?.companyDomain || email.company?.domain,
                industry_type: 'Contractor', // Default
                created_by: user.id
              })
              .select('id')
              .single();

            if (companyError) {
              result.errors.push(`Failed to create company "${companyName}": ${companyError.message}`);
              continue;
            }
            companyId = newCompany.id;
            result.companiesCreated++;
          }
          companyMap.set(companyName.toLowerCase(), companyId);
        }

        // Find or create contact if we have contact info
        let contactId: string | null = null;
        
        if (email.contact?.email) {
          const contactEmail = email.contact.email.toLowerCase();
          contactId = contactMap.get(contactEmail) || null;

          if (!contactId) {
            // Check if contact exists
            const { data: existingContact } = await supabase
              .from('contacts')
              .select('id')
              .ilike('email', contactEmail)
              .maybeSingle();

            if (existingContact) {
              contactId = existingContact.id;
            } else {
              // Create contact
              const { data: newContact, error: contactError } = await supabase
                .from('contacts')
                .insert({
                  company_id: companyId,
                  first_name: email.contact.firstName || 'Unknown',
                  last_name: email.contact.lastName || '',
                  email: email.contact.email,
                  title: email.contact.title
                })
                .select('id')
                .single();

              if (contactError) {
                result.errors.push(`Failed to create contact "${email.contact.email}": ${contactError.message}`);
              } else {
                contactId = newContact.id;
                result.contactsCreated++;
              }
            }
            if (contactId) {
              contactMap.set(contactEmail, contactId);
            }
          }
        }

        // Check for duplicate communication
        const { data: existingComm } = await supabase
          .from('company_communications')
          .select('id')
          .eq('company_id', companyId)
          .eq('subject', email.subject || '')
          .gte('sent_at', email.sentAt ? new Date(new Date(email.sentAt).getTime() - 60000).toISOString() : new Date().toISOString())
          .lte('sent_at', email.sentAt ? new Date(new Date(email.sentAt).getTime() + 60000).toISOString() : new Date().toISOString())
          .maybeSingle();

        if (existingComm) {
          result.skipped++;
          continue;
        }

        // Create communication record
        const { error: commError } = await supabase
          .from('company_communications')
          .insert({
            company_id: companyId,
            contact_id: contactId,
            user_id: user.id,
            communication_type: 'email',
            subject: email.subject,
            content: email.bodyText || email.bodyHtml || '',
            sent_at: email.sentAt,
            email_opened_at: email.openedAt,
            email_responded_at: email.repliedAt,
            used: true,
            notes: email.sequenceName ? `Apollo Sequence: ${email.sequenceName} (Step ${email.stepPosition || 1})` : 'Imported from Apollo'
          });

        if (commError) {
          result.errors.push(`Failed to create communication: ${commError.message}`);
        } else {
          result.communicationsCreated++;
        }

      } catch (error) {
        result.errors.push(`Error processing email "${email.subject}": ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Log import activity
    await supabase.from('import_export_logs').insert({
      user_id: user.id,
      activity_type: 'import',
      table_name: 'company_communications',
      record_count: result.communicationsCreated,
      successful_count: result.communicationsCreated,
      failed_count: result.errors.length,
      duplicate_count: result.skipped,
      error_summary: result.errors.length > 0 ? `${result.errors.length} errors during import` : null,
      detailed_errors: result.errors.length > 0 ? { errors: result.errors.slice(0, 10) } : null
    });

    setImportResult(result);
    setStep('results');

    if (result.communicationsCreated > 0) {
      onImportComplete?.();
    }
  };

  const getStatusBadge = (email: ApolloEmail) => {
    if (email.repliedAt) return <Badge className="bg-green-500">Replied</Badge>;
    if (email.bouncedAt) return <Badge variant="destructive">Bounced</Badge>;
    if (email.clickedAt) return <Badge className="bg-blue-500">Clicked</Badge>;
    if (email.openedAt) return <Badge className="bg-yellow-500">Opened</Badge>;
    if (email.sentAt) return <Badge variant="secondary">Sent</Badge>;
    return <Badge variant="outline">Draft</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Import Emails from Apollo
          </DialogTitle>
        </DialogHeader>

        {step === 'config' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>From Date</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>To Date</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Email Sequence (Optional)</Label>
              <Select value={selectedSequence} onValueChange={setSelectedSequence}>
                <SelectTrigger>
                  <SelectValue placeholder="All sequences" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sequences</SelectItem>
                  {sequences.map(seq => (
                    <SelectItem key={seq.id} value={seq.id}>
                      {seq.name} ({seq.num_steps} steps)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={fetchEmails} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Fetch Emails
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Status Filter Bar */}
            <div className="flex flex-wrap gap-2 mb-4 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mr-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filter by status:</span>
              </div>
              {STATUS_OPTIONS.map(option => {
                const count = option.value === 'all' 
                  ? emails.length 
                  : (statusCounts[option.value] || 0);
                const isActive = statusFilter === option.value;
                return (
                  <Button
                    key={option.value}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter(option.value)}
                    className="gap-1"
                  >
                    {option.label}
                    <Badge variant={isActive ? "secondary" : "outline"} className="ml-1 px-1.5 py-0 text-xs">
                      {count}
                    </Badge>
                  </Button>
                );
              })}
              {statusFilter !== 'all' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStatusFilter('all')}
                  className="gap-1"
                >
                  <X className="h-3 w-3" /> Clear
                </Button>
              )}
            </div>

            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-muted-foreground">
                Showing {filteredEmails.length} of {totalCount} emails • {selectedEmails.size} selected
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAll}>
                  <Eye className="h-4 w-4 mr-1" /> Select Visible
                </Button>
                <Button variant="outline" size="sm" onClick={deselectAll}>
                  <EyeOff className="h-4 w-4 mr-1" /> Deselect Visible
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1 border rounded-md">
              <div className="divide-y">
                {filteredEmails.map(email => (
                  <div
                    key={email.apolloId}
                    className="p-3 flex items-start gap-3 hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={selectedEmails.has(email.apolloId)}
                      onCheckedChange={() => toggleEmailSelection(email.apolloId)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium truncate">{email.subject || '(No subject)'}</span>
                        {getStatusBadge(email)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {email.contact?.companyName && (
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {email.contact.companyName}
                          </span>
                        )}
                        {email.contact?.email && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {email.contact.firstName} {email.contact.lastName}
                          </span>
                        )}
                        {email.sentAt && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(email.sentAt), 'MMM d, yyyy')}
                          </span>
                        )}
                      </div>
                      {email.sequenceName && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Sequence: {email.sequenceName} (Step {email.stepPosition || 1})
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex gap-2 justify-end mt-4">
              <Button variant="outline" onClick={() => setStep('config')}>
                Back
              </Button>
              <Button
                onClick={importEmails}
                disabled={selectedEmails.size === 0}
              >
                Import {selectedEmails.size} Emails
              </Button>
            </div>
          </div>
        )}

        {step === 'importing' && (
          <div className="py-8 space-y-6">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-lg font-medium">Importing emails...</p>
              <p className="text-sm text-muted-foreground">
                Creating companies, contacts, and communications
              </p>
            </div>
            <Progress value={importProgress} className="w-full" />
            <p className="text-center text-sm text-muted-foreground">
              {importProgress}% complete
            </p>
          </div>
        )}

        {step === 'results' && importResult && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{importResult.communicationsCreated}</div>
                <div className="text-sm text-muted-foreground">Communications Created</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{importResult.companiesCreated}</div>
                <div className="text-sm text-muted-foreground">Companies Created</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">{importResult.contactsCreated}</div>
                <div className="text-sm text-muted-foreground">Contacts Created</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-yellow-600">{importResult.skipped}</div>
                <div className="text-sm text-muted-foreground">Skipped (Duplicates)</div>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <h4 className="font-medium text-destructive mb-2 flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  {importResult.errors.length} Errors
                </h4>
                <ScrollArea className="max-h-32">
                  <ul className="text-sm space-y-1">
                    {importResult.errors.slice(0, 10).map((error, i) => (
                      <li key={i} className="text-muted-foreground">{error}</li>
                    ))}
                  </ul>
                </ScrollArea>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setStep('config')}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Import More
              </Button>
              <Button onClick={() => onOpenChange(false)}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
