import { useState, useEffect } from 'react';
import { useSessionTimeout } from '@/contexts/SessionTimeoutContext';
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
import { Mail, Building2, User, CheckCircle2, XCircle, Clock, Loader2, Download, RefreshCw, Eye, EyeOff, Filter, X, MousePointer } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
  openCount?: number;
  clickedAt?: string;
  clickCount?: number;
  repliedAt?: string;
  replyCount?: number;
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

type EmailStatus = 'all' | 'draft' | 'scheduled' | 'not_opened' | 'opened' | 'clicked' | 'replied' | 'bounced' | 'failed' | 'spam_blocked' | 'unsubscribed';

// Status options - only sent emails are imported (draft/scheduled are excluded by the API)
const STATUS_OPTIONS: { value: EmailStatus; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'not_opened', label: 'Not Opened' },  // Delivered but not opened (Apollo's terminology)
  { value: 'opened', label: 'Opened' },
  { value: 'clicked', label: 'Clicked' },
  { value: 'replied', label: 'Replied' },
  { value: 'bounced', label: 'Bounced' },
  { value: 'failed', label: 'Failed' },
  { value: 'unsubscribed', label: 'Unsubscribed' },
  { value: 'spam_blocked', label: 'Spam Blocked' },
];

// Map the normalized status from the API to our filter status (matching Apollo's breakdown)
const getEmailStatus = (email: ApolloEmail): EmailStatus => {
  const status = (email.status || '').toLowerCase();

  // Failure states first
  if (status === 'bounced' || !!email.bouncedAt) return 'bounced';
  if (status === 'spam_blocked' || !!email.spamBlocked) return 'spam_blocked';
  if (status === 'unsubscribed') return 'unsubscribed';
  if (status === 'failed') return 'failed';

  // Engagement states (most to least advanced)
  const isReplied = status === 'replied' || !!email.repliedAt || (email.replyCount ?? 0) > 0;
  const isClicked = status === 'clicked' || !!email.clickedAt || (email.clickCount ?? 0) > 0;
  const isOpened = status === 'opened' || !!email.openedAt || (email.openCount ?? 0) > 0;

  if (isReplied) return 'replied';
  if (isClicked) return 'clicked';
  if (isOpened) return 'opened';

  // not_opened = delivered/sent but never opened (matches Apollo's "Not Opened" category)
  if (status === 'not_opened' || email.sentAt) return 'not_opened';

  // Pre-send states
  if (status === 'scheduled') return 'scheduled';
  
  return 'draft';
};

export function ApolloEmailImportDialog({ open, onOpenChange, onImportComplete }: ApolloEmailImportDialogProps) {
  const { toast } = useToast();
  const { pauseTimeout, resumeTimeout } = useSessionTimeout();
  const [step, setStep] = useState<Step>('config');
  const [loading, setLoading] = useState(false);
  
  // Config state
  const [sequences, setSequences] = useState<ApolloSequence[]>([]);
  const [selectedSequence, setSelectedSequence] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [lastImportDate, setLastImportDate] = useState<string | null>(null);
  const [fetchEngagement, setFetchEngagement] = useState(false);
  
  // Preview state
  const [emails, setEmails] = useState<ApolloEmail[]>([]);
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState<EmailStatus>('all');
  const [alreadyImportedIds, setAlreadyImportedIds] = useState<Set<string>>(new Set());
  
  // Manual status overrides (for when Apollo doesn't report opens correctly)
  const [manualOpenedIds, setManualOpenedIds] = useState<Set<string>>(new Set());
  
  // Import state
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // Toggle manual opened status for an email
  const toggleManualOpened = (apolloId: string) => {
    const newSet = new Set(manualOpenedIds);
    if (newSet.has(apolloId)) {
      newSet.delete(apolloId);
    } else {
      newSet.add(apolloId);
    }
    setManualOpenedIds(newSet);
  };

  // Enhanced getEmailStatus that respects manual overrides
  const getEmailStatusWithOverride = (email: ApolloEmail): EmailStatus => {
    // If manually marked as opened, return opened (unless it has higher engagement)
    if (manualOpenedIds.has(email.apolloId)) {
      const baseStatus = getEmailStatus(email);
      // If already replied/clicked, keep that (higher engagement)
      if (baseStatus === 'replied' || baseStatus === 'clicked') {
        return baseStatus;
      }
      return 'opened';
    }
    return getEmailStatus(email);
  };

  // Compute status counts (using override)
  const statusCounts = emails.reduce((acc, email) => {
    const status = getEmailStatusWithOverride(email);
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Filter emails based on status (using override)
  const filteredEmails = emails.filter(email => {
    if (statusFilter === 'all') return true;
    return getEmailStatusWithOverride(email) === statusFilter;
  });

  // Fetch sequences and last import date on open
  useEffect(() => {
    if (open) {
      fetchSequences();
      fetchLastImportDate();
    } else {
      // Reset state when dialog closes
      setStep('config');
      setEmails([]);
      setSelectedEmails(new Set());
      setImportProgress(0);
      setImportResult(null);
      setStatusFilter('all');
      setAlreadyImportedIds(new Set());
      setManualOpenedIds(new Set());
      setFetchEngagement(false);
    }
  }, [open]);

  // Update dateFrom when lastImportDate changes (default to last import date)
  useEffect(() => {
    if (lastImportDate) {
      const lastDate = format(new Date(lastImportDate), 'yyyy-MM-dd');
      setDateFrom(lastDate);
    }
  }, [lastImportDate]);

  const fetchLastImportDate = async () => {
    try {
      const { data } = await supabase
        .from('import_export_logs')
        .select('created_at')
        .eq('activity_type', 'import')
        .eq('table_name', 'company_communications')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (data?.created_at) {
        setLastImportDate(data.created_at);
      }
    } catch (error) {
      console.error('Error fetching last import date:', error);
    }
  };

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
    pauseTimeout();
    try {
      const { data, error } = await supabase.functions.invoke('apollo-email-import', {
        body: {
          action: 'fetch-emails',
          dateFrom,
          dateTo,
          sequenceId: selectedSequence !== 'all' ? selectedSequence : undefined,
          perPage: 100,
          maxPages: 50, // Fetch all pages (up to 5000 emails)
          skipEngagementFetch: !fetchEngagement
        }
      });

      if (error) throw error;
      
      const fetchedEmails: ApolloEmail[] = data.emails || [];
      const excludedCount = data.excludedCount || 0;
      const totalFetched = data.totalFetched || fetchedEmails.length;
      
      // Check which emails have already been imported using apollo_email_activities table
      const apolloIds = fetchedEmails.map(e => e.apolloId).filter(Boolean);
      
      let importedIds = new Set<string>();
      if (apolloIds.length > 0) {
        const { data: existingActivities } = await supabase
          .from('apollo_email_activities')
          .select('apollo_activity_id')
          .in('apollo_activity_id', apolloIds);
        
        importedIds = new Set((existingActivities || []).map(a => a.apollo_activity_id));
      }
      setAlreadyImportedIds(importedIds);
      
      setEmails(fetchedEmails);
      setTotalCount(data.totalCount || fetchedEmails.length);
      
      // Only pre-select emails that haven't been imported yet
      const newEmailIds = fetchedEmails
        .filter(e => !importedIds.has(e.apolloId))
        .map(e => e.apolloId);
      setSelectedEmails(new Set(newEmailIds));
      
      if (fetchedEmails.length === 0 && excludedCount > 0) {
        toast({
          title: 'No Sent Emails Found',
          description: `Found ${totalFetched} emails from Apollo, but all ${excludedCount} were drafts or scheduled. Only sent emails can be imported. Try adjusting the date range.`,
        });
      } else if (fetchedEmails.length > 0) {
        setStep('preview');
      } else {
        toast({
          title: 'No Emails Found',
          description: 'No emails were found in Apollo for the selected date range and sequence.',
        });
      }
    } catch (error) {
      console.error('Error fetching emails:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch emails from Apollo',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
      resumeTimeout();
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
      return getEmailStatus(email) === status;
    });
    setSelectedEmails(new Set(emailsToSelect.map(e => e.apolloId)));
  };

  const importEmails = async () => {
    setStep('importing');
    pauseTimeout();
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
        const companyName = email.contact?.companyName || email.company?.name || 
          (email.contact?.email ? email.contact.email.split('@')[1]?.split('.')[0] : null) ||
          'Unknown Company';

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

        // Skip if already imported (check apollo_email_activities)
        if (alreadyImportedIds.has(email.apolloId)) {
          // Upsert engagement data on existing records instead of skipping entirely
          const hasEngagement = (email.openCount ?? 0) > 0 || (email.clickCount ?? 0) > 0 || (email.replyCount ?? 0) > 0;
          if (hasEngagement) {
            try {
              // Fetch existing record to store previous values for rollback
              const { data: existingRecord } = await supabase
                .from('apollo_email_activities')
                .select('id, open_count, click_count, reply_count, opened_at, clicked_at, replied_at, status, company_id, contact_id, subject, apollo_metadata, previous_engagement_values')
                .eq('apollo_activity_id', email.apolloId)
                .maybeSingle();

              if (existingRecord) {
                // Save previous values for rollback
                const previousValues = {
                  open_count: existingRecord.open_count,
                  click_count: existingRecord.click_count,
                  reply_count: existingRecord.reply_count,
                  opened_at: existingRecord.opened_at,
                  clicked_at: existingRecord.clicked_at,
                  replied_at: existingRecord.replied_at,
                  status: existingRecord.status,
                };

                // Build engagement update
                const engagementUpdate: Record<string, any> = {
                  open_count: Math.max(email.openCount || 0, existingRecord.open_count || 0),
                  click_count: Math.max(email.clickCount || 0, existingRecord.click_count || 0),
                  reply_count: Math.max(email.replyCount || 0, existingRecord.reply_count || 0),
                  updated_at: new Date().toISOString(),
                  previous_engagement_values: previousValues,
                };

                // Update timestamps if not already set
                if (!existingRecord.opened_at && email.openedAt) {
                  engagementUpdate.opened_at = email.openedAt;
                }
                if (!existingRecord.clicked_at && email.clickedAt) {
                  engagementUpdate.clicked_at = email.clickedAt;
                }
                if (!existingRecord.replied_at && email.repliedAt) {
                  engagementUpdate.replied_at = email.repliedAt;
                }

                // Upgrade status if engagement is higher
                const statusPriority: Record<string, number> = { sent: 0, not_opened: 1, opened: 2, clicked: 3, replied: 4 };
                let newStatus = existingRecord.status || 'sent';
                if ((email.replyCount ?? 0) > 0 && (statusPriority['replied'] > (statusPriority[newStatus] ?? 0))) {
                  newStatus = 'replied';
                } else if ((email.clickCount ?? 0) > 0 && (statusPriority['clicked'] > (statusPriority[newStatus] ?? 0))) {
                  newStatus = 'clicked';
                } else if ((email.openCount ?? 0) > 0 && (statusPriority['opened'] > (statusPriority[newStatus] ?? 0))) {
                  newStatus = 'opened';
                }
                engagementUpdate.status = newStatus;

                // Store match reasoning in metadata
                const contactName = [email.contact?.firstName, email.contact?.lastName].filter(Boolean).join(' ');
                const matchReason = contactName
                  ? `Engagement upsert via Apollo ID; contact '${contactName}' verified`
                  : 'Engagement upsert via Apollo ID';
                const existingMetadata = (existingRecord.apollo_metadata as Record<string, any>) || {};
                engagementUpdate.apollo_metadata = {
                  ...existingMetadata,
                  last_engagement_sync: new Date().toISOString(),
                  engagement_match_reason: matchReason,
                };

                await supabase
                  .from('apollo_email_activities')
                  .update(engagementUpdate)
                  .eq('id', existingRecord.id);

                // Also update company_communications if linked
                if (existingRecord.company_id && existingRecord.contact_id) {
                  const commUpdate: Record<string, any> = {};
                  if (email.openedAt) commUpdate.email_opened_at = email.openedAt;
                  if (email.repliedAt) commUpdate.email_responded_at = email.repliedAt;

                  if (Object.keys(commUpdate).length > 0) {
                    await supabase
                      .from('company_communications')
                      .update(commUpdate)
                      .eq('company_id', existingRecord.company_id)
                      .eq('contact_id', existingRecord.contact_id)
                      .ilike('subject', existingRecord.subject || '')
                      .is('email_opened_at', null);
                  }
                }

                // Count as engagement updated (reuse communicationsCreated for simplicity)
                result.communicationsCreated++;
              }
            } catch (err) {
              console.error('Failed to upsert engagement:', err);
            }
          }
          result.skipped++;
          continue;
        }

        // Duplicate check: only skip if we already tracked this Apollo ID
        // (removed overly strict subject+timestamp matching that was blocking legitimate imports)

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
          
          // Also record in apollo_email_activities for duplicate prevention
          try {
            await supabase.from('apollo_email_activities').insert({
              company_id: companyId,
              contact_id: contactId,
              created_by: user.id,
              activity_type: 'email',
              subject: email.subject,
              content: email.bodyText || email.bodyHtml || '',
              activity_date: email.sentAt || new Date().toISOString(),
              sent_at: email.sentAt,
              opened_at: email.openedAt,
              clicked_at: email.clickedAt,
              replied_at: email.repliedAt,
              sequence_name: email.sequenceName,
              sequence_step: email.stepPosition,
              open_count: email.openCount || 0,
              click_count: email.clickCount || 0,
              reply_count: email.replyCount || 0,
              status: email.status,
              apollo_activity_id: email.apolloId,
              apollo_contact_email: email.contact?.email
            });
          } catch (err) {
            console.error('Failed to log apollo activity:', err);
          }
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
    resumeTimeout();

    if (result.communicationsCreated > 0) {
      onImportComplete?.();
    }
  };

  const getStatusBadge = (email: ApolloEmail) => {
    const status = getEmailStatusWithOverride(email);
    const isManuallyOpened = manualOpenedIds.has(email.apolloId);
    
    switch (status) {
      case 'replied':
        return <Badge className="bg-green-500">Replied</Badge>;
      case 'clicked':
        return <Badge className="bg-blue-500">Clicked</Badge>;
      case 'opened':
        return (
          <Badge className="bg-yellow-500 text-black">
            {isManuallyOpened ? '✓ Opened (Manual)' : 'Opened'}
          </Badge>
        );
      case 'not_opened':
        return <Badge className="bg-emerald-600">Not Opened</Badge>;
      case 'scheduled':
        return <Badge className="bg-purple-500">Scheduled</Badge>;
      case 'bounced':
        return <Badge variant="destructive">Bounced</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'spam_blocked':
        return <Badge variant="destructive">Spam Blocked</Badge>;
      case 'unsubscribed':
        return <Badge variant="outline">Unsubscribed</Badge>;
      case 'draft':
      default:
        return <Badge variant="outline">Draft</Badge>;
    }
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

            <div className="flex items-center space-x-2">
              <Checkbox
                id="fetchEngagement"
                checked={fetchEngagement}
                onCheckedChange={(checked) => setFetchEngagement(!!checked)}
              />
              <Label htmlFor="fetchEngagement" className="text-sm font-normal cursor-pointer">
                Fetch engagement data (opens, clicks, replies) — slower but shows accurate metrics
              </Label>
            </div>

            {lastImportDate && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                <Clock className="h-4 w-4" />
                <span>Last import: {format(new Date(lastImportDate), 'MMM d, yyyy h:mm a')}</span>
              </div>
            )}

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
                {filteredEmails.map(email => {
                  const isAlreadyImported = alreadyImportedIds.has(email.apolloId);
                  return (
                  <div
                    key={email.apolloId}
                    className={`p-3 flex items-start gap-3 hover:bg-muted/50 ${isAlreadyImported ? 'opacity-60' : ''}`}
                  >
                    <Checkbox
                      checked={selectedEmails.has(email.apolloId)}
                      onCheckedChange={() => toggleEmailSelection(email.apolloId)}
                      disabled={isAlreadyImported}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-medium truncate">{email.subject || '(No subject)'}</span>
                        {getStatusBadge(email)}
                        {isAlreadyImported && (
                          <Badge variant="outline" className="text-xs bg-muted">Already Imported</Badge>
                        )}
                        {/* Manual toggle for opened status - only show if not already opened/clicked/replied */}
                        {getEmailStatusWithOverride(email) === 'not_opened' && !isAlreadyImported && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleManualOpened(email.apolloId);
                                  }}
                                >
                                  <MousePointer className="h-3 w-3 mr-1" />
                                  Mark Opened
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Mark as opened if Apollo didn't track it correctly</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {/* Show undo button if manually marked as opened */}
                        {manualOpenedIds.has(email.apolloId) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-muted-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleManualOpened(email.apolloId);
                            }}
                          >
                            <X className="h-3 w-3 mr-1" />
                            Undo
                          </Button>
                        )}
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
                  );
                })}
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
