import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, Phone, Linkedin, Copy, Check, Trash2, ExternalLink, Search, X, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';

export default function Communications() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [industryTypeFilter, setIndustryTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [communicationTypeFilter, setCommunicationTypeFilter] = useState('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

    return filtered;
  }, [communications, searchQuery, industryTypeFilter, statusFilter, communicationTypeFilter]);

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

  const clearFilters = () => {
    setSearchQuery('');
    setIndustryTypeFilter('all');
    setStatusFilter('all');
    setCommunicationTypeFilter('all');
  };

  const hasActiveFilters = searchQuery || industryTypeFilter !== 'all' || statusFilter !== 'all' || communicationTypeFilter !== 'all';

  return (
    <div className="flex flex-col h-screen">
      {/* Top Bar with Filters */}
      <div className="border-b border-border bg-card px-6 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Communications</h1>
            <p className="text-muted-foreground">View and manage all generated communications</p>
          </div>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            {filteredCommunications.length} {filteredCommunications.length === 1 ? 'Communication' : 'Communications'}
          </Badge>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-5 gap-4">
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
                        {comm.used && <Badge variant="secondary">Used</Badge>}
                        {comm.companies && (
                          <>
                            <Badge variant="outline">{comm.companies.company_name}</Badge>
                            <Badge>{comm.companies.industry_type}</Badge>
                            <Badge variant="secondary">{comm.companies.status}</Badge>
                          </>
                        )}
                      </div>

                      {comm.contacts && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="h-4 w-4" />
                          <span>
                            To: {comm.contacts.first_name} {comm.contacts.last_name}
                            {comm.contacts.title && ` - ${comm.contacts.title}`}
                            {comm.contacts.email && ` (${comm.contacts.email})`}
                          </span>
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
    </div>
  );
}