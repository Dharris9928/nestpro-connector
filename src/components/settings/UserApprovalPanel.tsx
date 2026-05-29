import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Clock, Mail, User, Key, MailCheck, MailOpen } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

interface PendingUser {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email?: string;
  created_at: string;
  approval_status: string;
  // temp_password removed — passwords are never stored in the DB.
  invitation_email_sent_at?: string | null;
  invitation_email_delivered_at?: string | null;
  invitation_email_opened_at?: string | null;
  invitation_email_status?: string | null;
}

export function UserApprovalPanel() {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchPendingUsers = async () => {
    try {
      setLoading(true);
      
      // Load profiles directly and enrich with emails via edge function
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, created_at, approval_status, invitation_email_sent_at, invitation_email_delivered_at, invitation_email_opened_at, invitation_email_status');

      if (profilesError) {
        throw profilesError;
      }

      const allProfiles = profiles || [];

      // Only organic sign-up requests: pending status (admin invites are auto-approved)
      const pendingProfiles = allProfiles.filter(p => p.approval_status === 'pending');

      // Fetch emails via edge function
      const { data: emailsData, error: emailsError } = await supabase.functions.invoke('get-user-emails', {
        body: { userIds: pendingProfiles.map(p => p.id) }
      });
      if (emailsError) {
        console.error('Error fetching user emails:', emailsError);
      }
      const emailsMap: Record<string, string> = emailsData?.emails || {};

      const usersWithEmails = pendingProfiles.map((profile: any) => ({
        id: profile.id,
        first_name: profile.first_name,
        last_name: profile.last_name,
        created_at: profile.created_at,
        approval_status: profile.approval_status,
        email: emailsMap[profile.id] || 'No email',
        invitation_email_sent_at: profile.invitation_email_sent_at || null,
        invitation_email_delivered_at: profile.invitation_email_delivered_at || null,
        invitation_email_opened_at: profile.invitation_email_opened_at || null,
        invitation_email_status: profile.invitation_email_status || null,
      }));

      setPendingUsers(usersWithEmails);
    } catch (error) {
      console.error('Error fetching pending users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load pending users',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingUsers();

    // Subscribe to profile changes
    const channel = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        () => {
          fetchPendingUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleApproval = async (userId: string, approve: boolean) => {
    setProcessingId(userId);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Update approval status
      const { error } = await supabase
        .from('profiles')
        .update({
          approval_status: approve ? 'approved' : 'rejected',
          approved_at: new Date().toISOString(),
          approved_by: user?.id
        })
        .eq('id', userId);

      if (error) throw error;

      // If approved, ensure user has a role (default to sales_rep for sign-ups)
      if (approve) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .upsert(
            { user_id: userId, role: 'sales_rep' },
            { onConflict: 'user_id' }
          );

        if (roleError) {
          console.error('Error assigning role:', roleError);
          throw new Error('Failed to assign user role');
        }
      }

      // Send notification email
      try {
        await supabase.functions.invoke('send-approval-status-notification', {
          body: {
            userId,
            status: approve ? 'approved' : 'rejected'
          }
        });
      } catch (notifError) {
        console.error('Error sending notification:', notifError);
        // Don't fail the approval if notification fails
      }

      toast({
        title: approve ? 'User Approved' : 'User Rejected',
        description: `User has been ${approve ? 'approved' : 'rejected'} successfully`,
      });

      fetchPendingUsers();
    } catch (error) {
      console.error('Error updating user status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user status',
        variant: 'destructive'
      });
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending User Approvals</CardTitle>
          <CardDescription>Loading pending user requests...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Pending User Approvals
          {pendingUsers.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {pendingUsers.length}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Review and approve new user registration requests
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {pendingUsers.length === 0 ? (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              No pending user approvals at this time
            </AlertDescription>
          </Alert>
        ) : (
          pendingUsers.map((user) => (
            <Card key={user.id} className="border">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {user.first_name && user.last_name
                          ? `${user.first_name} ${user.last_name}`
                          : 'No name provided'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      {user.email}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Requested: {new Date(user.created_at).toLocaleDateString()}
                    </div>
                    </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleApproval(user.id, true)}
                      disabled={processingId === user.id}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleApproval(user.id, false)}
                      disabled={processingId === user.id}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </CardContent>
    </Card>
  );
}