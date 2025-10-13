import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Trash2, AlertTriangle, Clock, CheckCircle2, XCircle, Info } from 'lucide-react';
import { toast } from 'sonner';

interface DeletionRequest {
  id: string;
  table_name: string;
  reason: string | null;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

export function RightToBeForgotten() {
  const queryClient = useQueryClient();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [reason, setReason] = useState('');

  // Fetch deletion requests
  const { data: requests, isLoading } = useQuery({
    queryKey: ['my-deletion-requests'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('deletion_requests')
        .select('*')
        .eq('requested_by', user.id)
        .eq('table_name', 'user_account')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as DeletionRequest[];
    },
  });

  // Create deletion request mutation
  const requestDeletion = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get user email for record details
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user.id)
        .single();

      const { data, error } = await supabase
        .from('deletion_requests')
        .insert({
          requested_by: user.id,
          table_name: 'user_account',
          record_id: user.id,
          reason: reason || 'User requested account deletion (GDPR Right to be Forgotten)',
          record_details: {
            email: user.email,
            name: profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown',
            requested_at: new Date().toISOString(),
          },
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-deletion-requests'] });
      setShowConfirmDialog(false);
      setReason('');
      toast.success('Deletion request submitted', {
        description: 'Your request will be reviewed by an administrator within 30 days',
      });
    },
    onError: (error: any) => {
      toast.error('Failed to submit deletion request', {
        description: error.message,
      });
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' => {
    switch (status) {
      case 'approved':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'rejected':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const hasPendingRequest = requests?.some((r) => r.status === 'pending');

  return (
    <>
      <Card className="border-destructive/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            <CardTitle>Right to be Forgotten</CardTitle>
          </div>
          <CardDescription>
            Request permanent deletion of your account and all associated data (GDPR Article 17)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> Account deletion is permanent and irreversible. All your data,
              including companies, contacts, communications, and activities will be permanently deleted
              after admin approval.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">What will be deleted:</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Your user account and profile</li>
                <li>All companies you've created</li>
                <li>All contacts associated with your companies</li>
                <li>All communications and activities</li>
                <li>All consent records and preferences</li>
                <li>Historical audit logs (anonymized after 90 days)</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Process timeline:</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Request reviewed within 30 days (GDPR requirement)</li>
                <li>Confirmation email sent before deletion</li>
                <li>Data permanently deleted within 7 days after approval</li>
              </ul>
            </div>
          </div>

          <Button
            variant="destructive"
            onClick={() => setShowConfirmDialog(true)}
            disabled={hasPendingRequest || requestDeletion.isPending}
            className="w-full"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {hasPendingRequest ? 'Deletion Request Pending' : 'Request Account Deletion'}
          </Button>

          {/* Deletion Request History */}
          {isLoading ? (
            <div className="space-y-2">
              <div className="h-16 bg-muted animate-pulse rounded" />
            </div>
          ) : requests && requests.length > 0 ? (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Deletion Requests</h4>
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(request.status)}
                    <div className="text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant={getStatusVariant(request.status)}>
                          {request.status}
                        </Badge>
                        <span className="text-muted-foreground">
                          {new Date(request.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {request.reason && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {request.reason}
                        </p>
                      )}
                      {request.reviewed_at && (
                        <p className="text-xs text-muted-foreground">
                          Reviewed: {new Date(request.reviewed_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Legal Rights:</strong> Under GDPR (Article 17) and CCPA, you have the right to
              request deletion of your personal data. Some data may be retained for legal compliance,
              security, or legitimate business purposes as permitted by law.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirm Account Deletion Request
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action will submit a request to permanently delete your account and all associated data.
              An administrator will review your request within 30 days.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="deletion-reason">Reason (optional)</Label>
              <Textarea
                id="deletion-reason"
                placeholder="Please tell us why you're deleting your account..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>

            <Alert variant="destructive">
              <AlertDescription>
                I understand that this action is irreversible and all my data will be permanently
                deleted after admin approval.
              </AlertDescription>
            </Alert>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => requestDeletion.mutate()}
              disabled={requestDeletion.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {requestDeletion.isPending ? 'Submitting...' : 'Submit Deletion Request'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
