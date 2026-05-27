import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { PasswordRequirements } from "@/components/ui/password-requirements";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from '@/components/ui/textarea';
import { toast } from "sonner";
import { Shield, ShieldAlert, ShieldCheck, Eye, Key, Pencil, Plus, Mail, Ban, UserX, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AddUserDialog } from "./AddUserDialog";

interface UserProfile {
  id: string;
  email: string;
  role: 'admin' | 'sales_manager' | 'sales_rep' | 'read_only';
  first_name: string | null;
  last_name: string | null;
  created_at: string;
  temp_password?: string | null;
  invitation_email_sent_at?: string | null;
  invitation_email_opened_at?: string | null;
  invitation_email_status?: string | null;
  approval_status?: string;
  account_status?: 'active' | 'suspended' | 'deactivated';
  last_sign_in_at?: string | null;
}

export function UserManagement() {
  const [approvedUsers, setApprovedUsers] = useState<UserProfile[]>([]);
  const [invitedUsers, setInvitedUsers] = useState<UserProfile[]>([]);
  const [pendingSignups, setPendingSignups] = useState<UserProfile[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, 'admin' | 'sales_manager' | 'sales_rep' | 'read_only'>>({});
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reminding, setReminding] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [targetStatus, setTargetStatus] = useState<'active' | 'suspended' | 'deactivated'>('active');
  const [statusReason, setStatusReason] = useState('');
  const [editForm, setEditForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    password: ""
  });

  useEffect(() => {
    loadUsers();
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    
    // Get role from user_roles table
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (profile && user.email) {
      setCurrentUser({
        ...profile,
        email: user.email,
        role: roleData?.role || 'sales_rep',
      } as UserProfile);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      // Get all profiles via backend function (admin only)
      const { data: listData, error: profilesError } = await supabase.functions.invoke('admin-list-profiles');

      let profiles: any[] = [];
      if (profilesError || !listData?.profiles) {
        console.error('Error fetching profiles:', profilesError);
        // Fallback: direct query (RLS may limit results)
      const { data: fallbackProfiles, error: fallbackError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, approval_status, created_at, temp_password, invitation_email_sent_at, invitation_email_delivered_at, invitation_email_opened_at, invitation_email_status, approved_at, approved_by, account_status');
        if (fallbackError) {
          throw fallbackError;
        }
        profiles = fallbackProfiles || [];
      } else {
        profiles = listData.profiles || [];
      }


      if (profiles.length === 0) {
        setApprovedUsers([]);
        setInvitedUsers([]);
        setPendingSignups([]);
        return;
      }

      // Get emails and login status from auth.users via edge function
      const { data: emailsData, error: emailsError } = await supabase.functions.invoke('get-user-emails', {
        body: { userIds: profiles.map(p => p.id) }
      });
      
      if (emailsError) {
        console.error('Error fetching user emails:', emailsError);
        toast.error('Failed to load user emails');
      }

      const emailsMap = emailsData?.emails || {};
      const loginStatusMap = emailsData?.loginStatus || {};

      // Get roles from user_roles table
      const userIds = profiles.map(p => p.id);
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);

      if (rolesError) {
        console.error('Error fetching user roles:', rolesError);
      }

      const rolesMap = (rolesData || []).reduce((acc, { user_id, role }) => {
        acc[user_id] = role;
        return acc;
      }, {} as Record<string, string>);

      // Map profiles to UserProfile format
      const allUsers = profiles.map((profile) => ({
        id: profile.id,
        email: emailsMap[profile.id] || 'Unknown',
        first_name: profile.first_name,
        last_name: profile.last_name,
        created_at: profile.created_at,
        role: rolesMap[profile.id] || 'sales_rep',
        temp_password: profile.temp_password,
        invitation_email_sent_at: profile.invitation_email_sent_at,
        invitation_email_opened_at: profile.invitation_email_opened_at,
        invitation_email_status: profile.invitation_email_status,
        approval_status: profile.approval_status,
        account_status: profile.account_status || 'active',
        last_sign_in_at: loginStatusMap[profile.id] || null,
      } as UserProfile));

      console.log('All users loaded:', allUsers);

      // Separate users into categories based on approval status AND login status
      // Active users: approved AND have logged in (regardless of temp_password)
      const approved = allUsers.filter(u => 
        u.approval_status === 'approved' && u.last_sign_in_at !== null
      );
      
      // Invited users (pending login): approved with temp_password but haven't logged in yet
      const invited = allUsers.filter(u => 
        u.temp_password && 
        u.approval_status === 'approved' && 
        u.last_sign_in_at === null
      );
      
      // Sign-up requests: no temp_password AND pending approval (organic sign-ups)
      const signups = allUsers.filter(u => 
        !u.temp_password && 
        u.approval_status === 'pending'
      );

      console.log('Invited users:', invited);
      console.log('Pending signups:', signups);
      console.log('Approved users:', approved);

      // Initialize selected roles for pending signups
      const initialRoles: Record<string, 'admin' | 'sales_manager' | 'sales_rep' | 'read_only'> = {};
      signups.forEach(user => {
        initialRoles[user.id] = user.role;
      });
      setSelectedRoles(initialRoles);

      setApprovedUsers(approved);
      setInvitedUsers(invited);
      setPendingSignups(signups);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: 'admin' | 'sales_manager' | 'sales_rep' | 'read_only') => {
    try {
      // Update in user_roles table (separate from profiles for security)
      const { error } = await supabase
        .from('user_roles')
        .upsert({ 
          user_id: userId, 
          role: newRole 
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      toast.success('User role updated successfully');
      loadUsers();
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error('Failed to update user role');
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUserId) {
      toast.error('Please select a user');
      return;
    }

    setResetting(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-reset-code', {
        body: { userId: selectedUserId }
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      // Show the code to admin
      if (data.code) {
        toast.success(
          data.emailSent 
            ? `Reset code sent via email: ${data.code} (valid for 15 minutes)` 
            : `Reset code generated: ${data.code} (valid for 15 minutes) - Please provide this code to the user manually`,
          { duration: 10000 }
        );
      }
      
      setResetDialogOpen(false);
      setSelectedUserId(null);
    } catch (error) {
      console.error('Error generating reset code:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate reset code');
    } finally {
      setResetting(false);
    }
  };

  const openEditDialog = (user: UserProfile) => {
    setSelectedUserId(user.id);
    setEditForm({
      email: user.email,
      firstName: user.first_name || "",
      lastName: user.last_name || "",
      password: ""
    });
    setEditDialogOpen(true);
  };

  const handleEditUser = async () => {
    if (!selectedUserId) return;

    // Validate password if provided
    if (editForm.password && (editForm.password.length < 8 || editForm.password.length > 20)) {
      toast.error('Password must be 8-20 characters');
      return;
    }

    setSaving(true);
    try {
      const updates: {
        userId: string;
        email?: string;
        firstName?: string;
        lastName?: string;
        password?: string;
      } = { userId: selectedUserId };

      // Only include fields that have changed
      const originalUser = approvedUsers.find(u => u.id === selectedUserId);
      if (editForm.email !== originalUser?.email) updates.email = editForm.email;
      if (editForm.firstName !== (originalUser?.first_name || "")) updates.firstName = editForm.firstName;
      if (editForm.lastName !== (originalUser?.last_name || "")) updates.lastName = editForm.lastName;
      if (editForm.password) updates.password = editForm.password;

      const { data, error } = await supabase.functions.invoke('admin-update-user', {
        body: updates
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      toast.success('User updated successfully');
      setEditDialogOpen(false);
      setEditForm({ email: "", firstName: "", lastName: "", password: "" });
      setSelectedUserId(null);
      loadUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const handleResendInvitation = async (userId: string) => {
    setReminding(true);
    try {
      const { data, error } = await supabase.functions.invoke('resend-invitation', {
        body: { userId }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Invitation reminder sent successfully!');
      loadUsers();
    } catch (error) {
      console.error('Error resending invitation:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to resend invitation');
    } finally {
      setReminding(false);
    }
  };

  const handleApproveUser = async (userId: string, role: 'admin' | 'sales_manager' | 'sales_rep' | 'read_only') => {
    try {
      // Update approval status
      const { error: approvalError } = await supabase
        .from('profiles')
        .update({
          approval_status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: currentUser?.id
        })
        .eq('id', userId);

      if (approvalError) throw approvalError;

      // Update role
      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert({
          user_id: userId,
          role
        }, {
          onConflict: 'user_id'
        });

      if (roleError) throw roleError;

      toast.success('User approved successfully!');
      loadUsers();
    } catch (error) {
      console.error('Error approving user:', error);
      toast.error('Failed to approve user');
    }
  };

  const handleRejectUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          approval_status: 'rejected'
        })
        .eq('id', userId);

      if (error) throw error;

      toast.success('User rejected');
      loadUsers();
    } catch (error) {
      console.error('Error rejecting user:', error);
      toast.error('Failed to reject user');
    }
  };

  const handleChangeAccountStatus = async (userId: string, newStatus: 'active' | 'suspended' | 'deactivated') => {
    setSelectedUserId(userId);
    setTargetStatus(newStatus);
    setStatusReason('');
    setStatusDialogOpen(true);
  };

  const confirmStatusChange = async () => {
    if (!selectedUserId) return;

    setChangingStatus(true);
    try {
      // Get current status
      const user = approvedUsers.find(u => u.id === selectedUserId);
      const oldStatus = user?.account_status || 'active';

      // Update account status
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          account_status: targetStatus,
          status_changed_at: new Date().toISOString(),
          status_changed_by: currentUser?.id,
          status_change_reason: statusReason
        })
        .eq('id', selectedUserId);

      if (profileError) throw profileError;

      // Log the status change
      const { error: logError } = await supabase
        .from('account_status_changes')
        .insert({
          user_id: selectedUserId,
          old_status: oldStatus,
          new_status: targetStatus,
          changed_by: currentUser?.id || '',
          reason: statusReason
        });

      if (logError) console.error('Error logging status change:', logError);

      const statusLabels = {
        active: 'activated',
        suspended: 'suspended',
        deactivated: 'deactivated'
      };

      toast.success(`User account ${statusLabels[targetStatus]} successfully`);
      setStatusDialogOpen(false);
      setSelectedUserId(null);
      setStatusReason('');
      loadUsers();
    } catch (error) {
      console.error('Error changing account status:', error);
      toast.error('Failed to change account status');
    } finally {
      setChangingStatus(false);
    }
  };

  const getAccountStatusBadge = (status: 'active' | 'suspended' | 'deactivated' | undefined) => {
    if (!status || status === 'active') {
      return (
        <Badge variant="default" className="gap-1">
          <CheckCircle className="h-3 w-3" />
          Active
        </Badge>
      );
    } else if (status === 'suspended') {
      return (
        <Badge variant="destructive" className="gap-1">
          <Ban className="h-3 w-3" />
          Suspended
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="gap-1">
          <UserX className="h-3 w-3" />
          Deactivated
        </Badge>
      );
    }
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<string, { variant: any; icon: any; label: string }> = {
      admin: { 
        variant: 'destructive', 
        icon: ShieldAlert, 
        label: 'Admin' 
      },
      sales_manager: { 
        variant: 'default', 
        icon: ShieldCheck, 
        label: 'Sales Manager' 
      },
      sales_rep: { 
        variant: 'secondary', 
        icon: Shield, 
        label: 'Sales Rep' 
      },
      read_only: { 
        variant: 'outline', 
        icon: Eye, 
        label: 'Read Only' 
      },
    };

    const config = variants[role] || variants.read_only;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const isAdmin = currentUser?.role === 'admin';

  if (!isAdmin) {
    return (
      <Alert>
        <ShieldAlert className="h-4 w-4" />
        <AlertDescription>
          You need administrator privileges to access user management.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending User Invites */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Pending User Invites</CardTitle>
            {invitedUsers.length > 0 && (
              <Badge variant="secondary">{invitedUsers.length}</Badge>
            )}
          </div>
          <CardDescription>
            Users who have been invited but haven't logged in yet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Temp Password</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitedUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground text-center py-6">
                    No pending invites
                  </TableCell>
                </TableRow>
              ) : (
                invitedUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      {user.first_name && user.last_name 
                        ? `${user.first_name} ${user.last_name}`
                        : 'N/A'}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{user.email}</TableCell>
                    <TableCell>
                      <code className="px-2 py-1 bg-muted rounded text-xs">
                        {user.temp_password || 'N/A'}
                      </code>
                    </TableCell>
                    <TableCell>
                      {user.invitation_email_opened_at ? (
                        <Badge variant="default">Email Opened</Badge>
                      ) : user.invitation_email_sent_at ? (
                        <Badge variant="secondary">Email Sent</Badge>
                      ) : (
                        <Badge variant="outline">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResendInvitation(user.id)}
                        disabled={reminding}
                      >
                        <Mail className="h-4 w-4 mr-1" />
                        {reminding ? 'Sending...' : 'Remind'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pending Sign-Up Requests */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Pending Sign-Up Requests</CardTitle>
            {pendingSignups.length > 0 && (
              <Badge variant="destructive">{pendingSignups.length}</Badge>
            )}
          </div>
          <CardDescription>
            Users who signed up and are waiting for approval
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Assign Role</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingSignups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground text-center py-6">
                    No pending sign-up requests
                  </TableCell>
                </TableRow>
              ) : (
                pendingSignups.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      {user.first_name && user.last_name 
                        ? `${user.first_name} ${user.last_name}`
                        : 'N/A'}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{user.email}</TableCell>
                    <TableCell>
                      <Select
                        value={selectedRoles[user.id] || user.role}
                        onValueChange={(value) => {
                          setSelectedRoles(prev => ({ 
                            ...prev, 
                            [user.id]: value as 'admin' | 'sales_manager' | 'sales_rep' | 'read_only'
                          }));
                        }}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="sales_manager">Sales Manager</SelectItem>
                          <SelectItem value="sales_rep">Sales Rep</SelectItem>
                          <SelectItem value="read_only">Read Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleApproveUser(user.id, selectedRoles[user.id] || user.role)}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRejectUser(user.id)}
                        >
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Approved Users */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Active Users</CardTitle>
              <CardDescription>
                Manage roles and security clearances for approved users
              </CardDescription>
            </div>
            <Button onClick={() => setAddUserDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading users...</div>
          ) : approvedUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No active users found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {approvedUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      {user.first_name && user.last_name 
                        ? `${user.first_name} ${user.last_name}`
                        : 'N/A'}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{user.email}</TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>{getAccountStatusBadge(user.account_status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {user.id === currentUser?.id ? (
                          <span className="text-sm text-muted-foreground">You</span>
                        ) : (
                          <>
                            <Select
                              value={user.role}
                              onValueChange={(value) => updateUserRole(user.id, value as 'admin' | 'sales_manager' | 'sales_rep' | 'read_only')}
                            >
                              <SelectTrigger className="w-40">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="sales_manager">Sales Manager</SelectItem>
                                <SelectItem value="sales_rep">Sales Rep</SelectItem>
                                <SelectItem value="read_only">Read Only</SelectItem>
                              </SelectContent>
                            </Select>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openEditDialog(user)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Edit user details</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedUserId(user.id);
                                      setResetDialogOpen(true);
                                    }}
                                  >
                                    <Key className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Reset password</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            {user.account_status === 'active' ? (
                              <>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleChangeAccountStatus(user.id, 'suspended')}
                                      >
                                        <Ban className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Suspend account (temporary)</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleChangeAccountStatus(user.id, 'deactivated')}
                                      >
                                        <UserX className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Deactivate account (permanent)</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </>
                            ) : (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="default"
                                      size="sm"
                                      onClick={() => handleChangeAccountStatus(user.id, 'active')}
                                    >
                                      <CheckCircle className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Reactivate account</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <div className="mt-6 space-y-2 text-sm text-muted-foreground">
            <p><strong>Role Permissions:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Admin:</strong> Full access to all features and data, can manage users</li>
              <li><strong>Sales Manager:</strong> Can view and edit all companies</li>
              <li><strong>Sales Rep:</strong> Can only view and edit their own companies</li>
              <li><strong>Read Only:</strong> Can only view their own companies, cannot edit</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information. Leave password blank to keep current password.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                placeholder="user@example.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-firstname">First Name</Label>
                <Input
                  id="edit-firstname"
                  type="text"
                  value={editForm.firstName}
                  onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                  placeholder="First name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-lastname">Last Name</Label>
                <Input
                  id="edit-lastname"
                  type="text"
                  value={editForm.lastName}
                  onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                  placeholder="Last name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-password">New Password (optional)</Label>
              <PasswordInput
                id="edit-password"
                value={editForm.password}
                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                placeholder="Leave blank to keep current"
              />
              {editForm.password && <PasswordRequirements password={editForm.password} />}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false);
                setEditForm({ email: "", firstName: "", lastName: "", password: "" });
                setSelectedUserId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditUser}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset User Password</DialogTitle>
            <DialogDescription>
              A temporary password will be automatically generated and sent to the user via email. The user will need to use this temporary password to set a new password.
            </DialogDescription>
          </DialogHeader>
          <Alert>
            <Key className="h-4 w-4" />
            <AlertDescription>
              The temporary password will be securely generated and sent to the user's email address. They will be prompted to create a new password upon their next login.
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setResetDialogOpen(false);
                setSelectedUserId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleResetPassword}
              disabled={resetting}
            >
              {resetting ? "Generating..." : "Generate & Send Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddUserDialog
        open={addUserDialogOpen}
        onOpenChange={setAddUserDialogOpen}
        onUserAdded={loadUsers}
      />

      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {targetStatus === 'active' ? 'Reactivate' : targetStatus === 'suspended' ? 'Suspend' : 'Deactivate'} User Account
            </DialogTitle>
            <DialogDescription>
              {targetStatus === 'active' 
                ? 'This will restore full access to the user account.'
                : targetStatus === 'suspended'
                ? 'This will temporarily suspend the user account. The user will not be able to log in or access any data.'
                : 'This will permanently deactivate the user account. The user will not be able to log in or access any data.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="status-reason">Reason {targetStatus !== 'active' && '(Required)'}</Label>
              <Textarea
                id="status-reason"
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder={
                  targetStatus === 'suspended' 
                    ? 'e.g., Policy violation, security concern, pending investigation...'
                    : targetStatus === 'deactivated'
                    ? 'e.g., Employment terminated, contract ended...'
                    : 'e.g., Investigation cleared, suspension period ended...'
                }
                className="min-h-[100px]"
              />
            </div>
            {targetStatus !== 'active' && (
              <Alert>
                <ShieldAlert className="h-4 w-4" />
                <AlertDescription>
                  <strong>Warning:</strong> The user will immediately lose access to the system and all data.
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setStatusDialogOpen(false);
                setSelectedUserId(null);
                setStatusReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant={targetStatus === 'active' ? 'default' : 'destructive'}
              onClick={confirmStatusChange}
              disabled={changingStatus || (targetStatus !== 'active' && !statusReason.trim())}
            >
              {changingStatus 
                ? 'Processing...' 
                : targetStatus === 'active' 
                ? 'Reactivate Account' 
                : targetStatus === 'suspended'
                ? 'Suspend Account'
                : 'Deactivate Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
