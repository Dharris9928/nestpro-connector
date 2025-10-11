import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { 
  LogIn, 
  LogOut, 
  Key, 
  ShieldAlert, 
  ShieldCheck,
  Search 
} from 'lucide-react';

interface AuthEvent {
  id: string;
  user_id: string | null;
  event_type: string;
  email_attempted: string | null;
  ip_address: string | null;
  user_agent: string | null;
  failure_reason: string | null;
  metadata: any;
  created_at: string;
}

export function AuthEventsLog() {
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: events, isLoading } = useQuery({
    queryKey: ['auth-events', eventTypeFilter],
    queryFn: async () => {
      let query = supabase
        .from('auth_events_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (eventTypeFilter !== 'all') {
        query = query.eq('event_type', eventTypeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AuthEvent[];
    },
  });

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'LOGIN_SUCCESS':
        return <LogIn className="h-4 w-4 text-green-500" />;
      case 'LOGIN_FAILED':
        return <ShieldAlert className="h-4 w-4 text-red-500" />;
      case 'LOGOUT':
        return <LogOut className="h-4 w-4 text-blue-500" />;
      case 'PASSWORD_RESET':
        return <Key className="h-4 w-4 text-amber-500" />;
      case 'MFA_ENROLLED':
      case 'MFA_VERIFIED':
        return <ShieldCheck className="h-4 w-4 text-purple-500" />;
      default:
        return null;
    }
  };

  const getEventVariant = (eventType: string) => {
    switch (eventType) {
      case 'LOGIN_SUCCESS':
        return 'default';
      case 'LOGIN_FAILED':
        return 'destructive';
      case 'LOGOUT':
        return 'secondary';
      case 'PASSWORD_RESET':
        return 'outline';
      case 'MFA_ENROLLED':
      case 'MFA_VERIFIED':
        return 'default';
      default:
        return 'outline';
    }
  };

  const filteredEvents = events?.filter(event => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      event.event_type.toLowerCase().includes(search) ||
      event.email_attempted?.toLowerCase().includes(search) ||
      event.ip_address?.toLowerCase().includes(search)
    );
  });

  if (isLoading) {
    return <div>Loading authentication events...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Authentication Events</CardTitle>
        <CardDescription>
          Complete history of login attempts, logouts, and security events
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by email, event type, or IP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by event" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              <SelectItem value="LOGIN_SUCCESS">Login Success</SelectItem>
              <SelectItem value="LOGIN_FAILED">Login Failed</SelectItem>
              <SelectItem value="LOGOUT">Logout</SelectItem>
              <SelectItem value="PASSWORD_RESET">Password Reset</SelectItem>
              <SelectItem value="MFA_ENROLLED">MFA Enrolled</SelectItem>
              <SelectItem value="MFA_VERIFIED">MFA Verified</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Events List */}
        <div className="space-y-2">
          {filteredEvents && filteredEvents.length > 0 ? (
            filteredEvents.map((event) => (
              <div
                key={event.id}
                className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {getEventIcon(event.event_type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={getEventVariant(event.event_type) as any}>
                        {event.event_type.replace(/_/g, ' ')}
                      </Badge>
                      {event.email_attempted && (
                        <span className="text-sm font-medium truncate">
                          {event.email_attempted}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(event.created_at), 'PPp')}
                      {event.ip_address && ` • IP: ${event.ip_address}`}
                    </p>
                    {event.failure_reason && (
                      <p className="text-xs text-destructive mt-1">
                        Reason: {event.failure_reason}
                      </p>
                    )}
                    {event.user_agent && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {event.user_agent}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No authentication events found matching your filters.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
