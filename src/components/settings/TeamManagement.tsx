import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Users, Plus, X, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TeamMember {
  id: string;
  team_member_id: string;
  added_at: string;
  profiles: {
    first_name: string;
    last_name: string;
  };
}

interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
}

export function TeamManagement() {
  const { toast } = useToast();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadTeamData();
  }, []);

  const loadTeamData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load current team members
      const { data: members, error: membersError } = await supabase
        .from('team_memberships')
        .select(`
          id,
          team_member_id,
          added_at
        `)
        .eq('manager_id', user.id)
        .eq('is_active', true)
        .order('added_at', { ascending: false });

      if (membersError) throw membersError;

      // Get profile information for team members
      const memberIds = members?.map(m => m.team_member_id) || [];
      const { data: memberProfiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', memberIds);

      const profilesMap = new Map(
        memberProfiles?.map(p => [p.id, p]) || []
      );

      const enrichedMembers = members?.map(m => ({
        ...m,
        profiles: profilesMap.get(m.team_member_id) || { first_name: '', last_name: '' }
      })) || [];

      setTeamMembers(enrichedMembers);

      // Load available users (sales reps who aren't already on the team)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('approval_status', 'approved')
        .neq('id', user.id);

      if (profilesError) throw profilesError;

      // Get user roles to filter sales reps
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('role', 'sales_rep');

      if (rolesError) throw rolesError;

      const salesRepIds = new Set(userRoles?.map(ur => ur.user_id) || []);
      const currentTeamMemberIds = new Set(members?.map(m => m.team_member_id) || []);

      const available = profiles
        ?.filter(p => salesRepIds.has(p.id) && !currentTeamMemberIds.has(p.id))
        .map(p => ({
          id: p.id,
          email: '',
          first_name: p.first_name || '',
          last_name: p.last_name || '',
        })) || [];

      setAvailableUsers(available);
    } catch (error: any) {
      console.error('Error loading team data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load team data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!selectedUserId) return;

    setAdding(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('team_memberships')
        .insert({
          manager_id: user.id,
          team_member_id: selectedUserId,
          added_by: user.id,
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Team member added successfully',
      });

      setSelectedUserId('');
      loadTeamData();
    } catch (error: any) {
      console.error('Error adding team member:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add team member',
        variant: 'destructive',
      });
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveMember = async (membershipId: string) => {
    try {
      const { error } = await supabase
        .from('team_memberships')
        .update({ is_active: false })
        .eq('id', membershipId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Team member removed',
      });

      loadTeamData();
    } catch (error: any) {
      console.error('Error removing team member:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove team member',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <CardTitle>Team Management</CardTitle>
        </div>
        <CardDescription>
          Manage your sales team members. Team members' records will be visible in the "My Team" perspective filter.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add Team Member */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Add Team Member</h3>
          <div className="flex gap-2">
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select a sales rep..." />
              </SelectTrigger>
              <SelectContent>
                {availableUsers.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">
                    No available sales reps
                  </div>
                ) : (
                  availableUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.first_name} {user.last_name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <Button
              onClick={handleAddMember}
              disabled={!selectedUserId || adding}
            >
              {adding ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Current Team Members */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Current Team Members ({teamMembers.length})</h3>
          {teamMembers.length === 0 ? (
            <Alert>
              <AlertDescription>
                No team members yet. Add sales reps to your team to see their records in the "My Team" perspective.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-2">
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">
                      {member.profiles?.first_name} {member.profiles?.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Added {new Date(member.added_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveMember(member.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}