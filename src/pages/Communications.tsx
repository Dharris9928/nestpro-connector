import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Mail, Phone, Linkedin, Reply, Trash2, ExternalLink, Search, X, User, Calendar, Video, GraduationCap, MessageSquare, Pencil, Download, Eye, MessageCircle, Plus, ChevronDown, Sparkles, Handshake, PhoneCall } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';
import { NewCommunicationDialog } from '@/components/companies/NewCommunicationDialog';
import { EditCommunicationDialog } from '@/components/companies/EditCommunicationDialog';
import { ApolloEmailImportDialog } from '@/components/communications/ApolloEmailImportDialog';
import { ApolloEngagementImportDialog } from '@/components/communications/ApolloEngagementImportDialog';
import { AddCommunicationDialog } from '@/components/communications/AddCommunicationDialog';
import { MarkAsRepliedDialog } from '@/components/communications/MarkAsRepliedDialog';
import { HandoffDialog } from '@/components/communications/HandoffDialog';
import { ScheduleMeetingDialog } from '@/components/communications/ScheduleMeetingDialog';
import { getQuarterOptions } from '@/lib/dates/quarterUtils';

export default function Communications() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [industryTypeFilter, setIndustryTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [communicationTypeFilter, setCommunicationTypeFilter] = useState('all');
  const [emailStatusFilter, setEmailStatusFilter] = useState('all');
  const [conversationStatusFilter, setConversationStatusFilter] = useState<string>('active');
  const [openNewCommDialog, setOpenNewCommDialog] = useState(false);
  const [replyToCompanyId, setReplyToCompanyId] = useState<string | null>(null);
  const [replyToContactId, setReplyToContactId] = useState<string | null>(null);
  const [replyToPreviousContext, setReplyToPreviousContext] = useState<string>('');
  const [replyCommunicationType, setReplyCommunicationType] = useState<'email' | 'call_script' | 'linkedin_message'>('email');
  const [editCommunication, setEditCommunication] = useState<any>(null);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openApolloImport, setOpenApolloImport] = useState(false);
  const [openEngagementImport, setOpenEngagementImport] = useState(false);
  const [replyDialogComm, setReplyDialogComm] = useState<any>(null);
  const [openReplyDialog, setOpenReplyDialog] = useState(false);
  const [openManualDialog, setOpenManualDialog] = useState(false);
  const [handoffDialogComm, setHandoffDialogComm] = useState<any>(null);
  const [openHandoffDialog, setOpenHandoffDialog] = useState(false);
  const [meetingDialogComm, setMeetingDialogComm] = useState<any>(null);
  const [openMeetingDialog, setOpenMeetingDialog] = useState(false);
  const [quarterFilter, setQuarterFilter] = useState<string>("all");
  const quarterOptions = getQuarterOptions();

  // Handle URL query param to auto-open communication by ID
  const commIdFromUrl = searchParams.get('id');
  
  const { data: commFromUrl } = useQuery({
    queryKey: ["communication-by-id", commIdFromUrl],
    queryFn: async () => {
      if (!commIdFromUrl) return null;
      const { data, error } = await supabase
        .from("company_communications")
        .select(`
          *,
          companies(company_name, industry_type),
          contacts(first_name, last_name)
        `)
        .eq("id", commIdFromUrl)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!commIdFromUrl,
  });

  // Auto-open communication from URL param
  useEffect(() => {
    if (commFromUrl && commIdFromUrl) {
      setEditCommunication(commFromUrl);
      setOpenEditDialog(true);
      // Clear the URL param after opening
      setSearchParams({}, { replace: true });
    }
  }, [commFromUrl, commIdFromUrl, setSearchParams]);

  const { data: communications, isLoading, refetch } = useQuery({
    queryKey: ['all-communications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_communications')
        .select(`
          *,
          companies(
            company_name,
            industry_type,
            status,
            company_type
          ),
          contacts(
            first_name,
            last_name,
            title,
            email
          ),
          assigned_to_profile:profiles!company_communications_assigned_to_fkey(
            first_name,
            last_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const filteredCommunications = useMemo(() => {
    if (!communications) return [];

    let filtered = [...communications];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((comm) =>
        comm.companies?.company_name?.toLowerCase().includes(query) ||
        comm.subject?.toLowerCase().includes(query) ||
        comm.content?.toLowerCase().includes(query) ||
        comm.contacts?.first_name?.toLowerCase().includes(query) ||
        comm.contacts?.last_name?.toLowerCase().includes(query)
      );
    }

    // Industry type filter
    if (industryTypeFilter !== 'all') {
      filtered = filtered.filter((comm) => comm.companies?.industry_type === industryTypeFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((comm) => comm.companies?.status === statusFilter);
    }

    // Communication type filter
    if (communicationTypeFilter !== 'all') {
      filtered = filtered.filter((comm) => comm.communication_type === communicationTypeFilter);
    }

    // Email status filter
    if (emailStatusFilter !== 'all') {
      filtered = filtered.filter((comm) => {
        const hasResponded = !!comm.email_responded_at;
        const hasOpened = !!comm.email_opened_at;
        const hasSent = !!comm.sent_at;
        
        switch (emailStatusFilter) {
          case 'draft':
            return !hasSent;
          case 'sent':
            return hasSent && !hasOpened && !hasResponded;
          case 'opened':
            return hasOpened && !hasResponded;
          case 'responded':
            return hasResponded;
          default:
            return true;
        }
      });
    }

    // Quarter filter
    if (quarterFilter !== 'all') {
      const selectedQ = quarterOptions.find(q => q.value === quarterFilter);
      if (selectedQ) {
        filtered = filtered.filter((comm) => {
          const createdAt = new Date(comm.created_at);
          return createdAt >= selectedQ.from && createdAt <= selectedQ.to;
        });
      }
    }

    // Conversation status filter
    if (conversationStatusFilter === 'active') {
      filtered = filtered.filter((comm) => comm.conversation_active !== false);
    } else if (conversationStatusFilter === 'inactive') {
      filtered = filtered.filter((comm) => comm.conversation_active === false);
    }

    return filtered;
  }, [communications, searchQuery, industryTypeFilter, statusFilter, communicationTypeFilter, emailStatusFilter, conversationStatusFilter]);

  const handleReply = (comm: any) => {
    setReplyToCompanyId(comm.company_id);
    setReplyToContactId(comm.contact_id);
    setReplyToPreviousContext(`Previous ${getTypeLabel(comm.communication_type)}:\nSubject: ${comm.subject || 'N/A'}\n\n${comm.content}`);
    setReplyCommunicationType(comm.communication_type);
    setOpenNewCommDialog(true);
  };

  const handleEdit = (comm: any) => {
    setEditCommunication(comm);
    setOpenEditDialog(true);
  };

  const handleNavigateToCompany = (companyId: string) => {
    navigate(`/companies?company=${companyId}`);
  };

  const handleNavigateToContact = (contactId: string, companyId: string) => {
    navigate(`/companies?company=${companyId}&contact=${contactId}`);
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

      await refetch();
    } catch (error: any) {
      console.error('Error deleting communication:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete communication',
        variant: 'destructive',
      });
    }
  };

  const handleMarkAsAttempted = async (id: string) => {
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
        description: 'Communication marked as attempted',
      });

      await refetch();
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

      await refetch();
    } catch (error: any) {
      console.error('Error updating conversation status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update conversation status',
        variant: 'destructive',
      });
    }
  };

  const handleMarkAsOpened = async (id: string) => {
    try {
      const { error } = await supabase
        .from('company_communications')
        .update({ 
          email_opened_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Updated',
        description: 'Email marked as opened',
      });

      await refetch();
    } catch (error: any) {
      console.error('Error marking as opened:', error);
      toast({
        title: 'Error',
        description: 'Failed to update email status',
        variant: 'destructive',
      });
    }
  };

  const handleMarkAsResponded = async (id: string) => {
    try {
      const { error } = await supabase
        .from('company_communications')
        .update({ 
          email_responded_at: new Date().toISOString(),
          email_opened_at: new Date().toISOString() // Also mark as opened if not already
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Updated',
        description: 'Email marked as responded',
      });

      await refetch();
    } catch (error: any) {
      console.error('Error marking as responded:', error);
      toast({
        title: 'Error',
        description: 'Failed to update email status',
        variant: 'destructive',
      });
    }
  };

  const handleLogCall = async (comm: any) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      // Create phone call activity in outreach_activities
      const { data: activity, error: activityError } = await supabase
        .from("outreach_activities")
        .insert({
          company_id: comm.company_id,
          activity_type: "Phone",
          subject_line: `Phone call with ${comm.companies?.company_name || 'Company'}`,
          outcome: "Completed",
          completed_date: new Date().toISOString().split("T")[0],
          created_by: userData.user.id,
        })
        .select()
        .single();

      if (activityError) throw activityError;

      // If there's a contact, link it to the activity
      if (comm.contact_id && activity) {
        await supabase
          .from("activity_contacts")
          .insert({
            activity_id: activity.id,
            contact_id: comm.contact_id,
          });
      }

      toast({
        title: "Call Logged",
        description: "Phone call activity has been logged",
      });

      await refetch();
    } catch (error: any) {
      console.error("Error logging call:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to log call",
        variant: "destructive",
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

  const getEmailStatusBadge = (comm: any) => {
    if (comm.email_responded_at) {
      return <Badge className="bg-green-600 text-white">Responded</Badge>;
    }
    if (comm.email_opened_at) {
      return <Badge className="bg-cyan-600 text-white">Opened</Badge>;
    }
    if (comm.sent_at) {
      return <Badge className="bg-blue-600 text-white">Sent</Badge>;
    }
    return <Badge variant="outline">Draft</Badge>;
  };

  const clearFilters = () => {
    setSearchQuery('');
    setIndustryTypeFilter('all');
    setStatusFilter('all');
    setCommunicationTypeFilter('all');
    setEmailStatusFilter('all');
    setConversationStatusFilter('active');
    setQuarterFilter('all');
  };

  const hasActiveFilters = searchQuery || industryTypeFilter !== 'all' || statusFilter !== 'all' || communicationTypeFilter !== 'all' || emailStatusFilter !== 'all' || quarterFilter !== 'all';

  return (
    <div className="flex flex-col h-screen">
      {/* Top Bar with Filters */}
      <div className="border-b border-border bg-card px-6 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Communications</h1>
            <p className="text-muted-foreground">View and manage all generated communications</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Import Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Import
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card z-50">
                <DropdownMenuItem onClick={() => setOpenApolloImport(true)}>
                  <Mail className="h-4 w-4 mr-2" />
                  Import Emails from Apollo
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setOpenEngagementImport(true)}>
                  <Eye className="h-4 w-4 mr-2" />
                  Import Opened Emails (CSV)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Combined New Communication Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Communication
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card z-50">
                <DropdownMenuItem onClick={() => setOpenNewCommDialog(true)}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate with AI
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setOpenManualDialog(true)}>
                  <Mail className="h-4 w-4 mr-2" />
                  Add Manual Email
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Select value={conversationStatusFilter} onValueChange={setConversationStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active Conversations</SelectItem>
                <SelectItem value="inactive">Inactive Conversations</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="secondary" className="text-lg px-4 py-2">
              {filteredCommunications.length} {filteredCommunications.length === 1 ? 'Communication' : 'Communications'}
            </Badge>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-7 gap-4">
          <div className="col-span-2">
            <Label>Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search companies, contacts, content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div>
            <Label>Industry Type</Label>
            <Select value={industryTypeFilter} onValueChange={setIndustryTypeFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Industries</SelectItem>
                <SelectItem value="Builder">Builder</SelectItem>
                <SelectItem value="Contractor">Contractor</SelectItem>
                <SelectItem value="Energy Implementer">Energy Implementer</SelectItem>
                <SelectItem value="Engineer/Architect">Engineer/Architect</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Lead">Lead</SelectItem>
                <SelectItem value="Contacted">Contacted</SelectItem>
                <SelectItem value="Engaged">Engaged</SelectItem>
                <SelectItem value="Pilot">Pilot</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
                <SelectItem value="Lost">Lost</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Communication Type</Label>
            <Select value={communicationTypeFilter} onValueChange={setCommunicationTypeFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="call_script">Call Script</SelectItem>
                <SelectItem value="linkedin_message">LinkedIn Message</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Email Status</Label>
            <Select value={emailStatusFilter} onValueChange={setEmailStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Email Statuses</SelectItem>
                <SelectItem value="draft">Draft (Not Sent)</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="opened">Opened</SelectItem>
                <SelectItem value="responded">Responded</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Quarter</Label>
            <Select value={quarterFilter} onValueChange={setQuarterFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                {quarterOptions.map(q => (
                  <SelectItem key={q.value} value={q.value}>{q.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear all filters
          </Button>
        )}
      </div>

      {/* Communications List */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading communications...</p>
          </div>
        ) : filteredCommunications.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {hasActiveFilters ? 'No communications match your filters' : 'No communications generated yet'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredCommunications.map((comm: any) => (
              <Card key={comm.id} className={comm.used ? 'opacity-60' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getTypeIcon(comm.communication_type)}
                        <CardTitle className="text-base">{getTypeLabel(comm.communication_type)}</CardTitle>
                        {getEmailStatusBadge(comm)}
                        {comm.used && <Badge variant="secondary">Used</Badge>}
                        <Badge variant={comm.conversation_active !== false ? "default" : "secondary"}>
                          {comm.conversation_active !== false ? "Active" : "Inactive"}
                        </Badge>
                        {comm.assigned_to_profile && (
                          <Badge className="bg-purple-600 text-white">
                            <Handshake className="h-3 w-3 mr-1" />
                            Handed off to: {comm.assigned_to_profile.first_name} {comm.assigned_to_profile.last_name}
                          </Badge>
                        )}
                        {comm.companies && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleNavigateToCompany(comm.company_id)}
                              className="h-6 px-2"
                            >
                              {comm.companies.company_name}
                            </Button>
                            <Badge>{comm.companies.industry_type}</Badge>
                            <Badge variant="secondary">{comm.companies.status}</Badge>
                          </>
                        )}
                      </div>

                      {comm.contacts && (
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">To:</span>
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() => handleNavigateToContact(comm.contact_id, comm.company_id)}
                            className="h-auto p-0 text-sm"
                          >
                            {comm.contacts.first_name} {comm.contacts.last_name}
                          </Button>
                          {comm.contacts.title && <span className="text-muted-foreground">- {comm.contacts.title}</span>}
                          {comm.contacts.email && <span className="text-muted-foreground">({comm.contacts.email})</span>}
                        </div>
                      )}

                      {comm.subject && (
                        <CardDescription className="font-medium">
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
                        title="Reply to this communication"
                      >
                        <Reply className="h-4 w-4" />
                      </Button>
                      {/* Handoff Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setHandoffDialogComm(comm);
                          setOpenHandoffDialog(true);
                        }}
                        title="Hand off to team member"
                        className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                      >
                        <Handshake className="h-4 w-4" />
                      </Button>
                      {/* Called Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLogCall(comm)}
                        title="Log a phone call"
                        className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                      >
                        <PhoneCall className="h-4 w-4" />
                      </Button>
                      {/* Schedule Meeting Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setMeetingDialogComm(comm);
                          setOpenMeetingDialog(true);
                        }}
                        title="Schedule a meeting"
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <Calendar className="h-4 w-4" />
                      </Button>
                      {/* Quick status buttons - always visible for sent emails */}
                      {!comm.email_opened_at && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarkAsOpened(comm.id)}
                          title="Mark as opened"
                          className="text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      {!comm.email_responded_at && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setReplyDialogComm(comm);
                            setOpenReplyDialog(true);
                          }}
                          title="Mark as replied"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                      )}
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
                          onClick={() => handleMarkAsAttempted(comm.id)}
                          title="Mark as attempted"
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
          </div>
        )}
      </div>

      <NewCommunicationDialog
        open={openNewCommDialog}
        onOpenChange={(open) => {
          setOpenNewCommDialog(open);
          if (!open) {
            setReplyToCompanyId(null);
            setReplyToContactId(null);
            setReplyToPreviousContext('');
          }
        }}
        onSuccess={refetch}
        prefilledCompanyId={replyToCompanyId || undefined}
        prefilledContactId={replyToContactId || undefined}
        prefilledPreviousContext={replyToPreviousContext || undefined}
        prefilledCommunicationType={replyCommunicationType}
      />

      <AddCommunicationDialog 
        open={openManualDialog}
        onOpenChange={setOpenManualDialog}
        onSuccess={() => refetch()} 
      />

      <EditCommunicationDialog
        communication={editCommunication}
        open={openEditDialog}
        onOpenChange={setOpenEditDialog}
        onSuccess={refetch}
      />

      <ApolloEmailImportDialog
        open={openApolloImport}
        onOpenChange={setOpenApolloImport}
        onImportComplete={refetch}
      />

      <ApolloEngagementImportDialog
        open={openEngagementImport}
        onOpenChange={setOpenEngagementImport}
        onImportComplete={refetch}
      />

      {replyDialogComm && (
        <MarkAsRepliedDialog
          open={openReplyDialog}
          onOpenChange={setOpenReplyDialog}
          communication={replyDialogComm}
          onSuccess={refetch}
        />
      )}

      {handoffDialogComm && (
        <HandoffDialog
          open={openHandoffDialog}
          onOpenChange={setOpenHandoffDialog}
          communication={handoffDialogComm}
          onSuccess={refetch}
        />
      )}

      {meetingDialogComm && (
        <ScheduleMeetingDialog
          open={openMeetingDialog}
          onOpenChange={setOpenMeetingDialog}
          communication={meetingDialogComm}
          onSuccess={refetch}
        />
      )}
    </div>
  );
}