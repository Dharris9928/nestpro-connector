import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Shield, ShieldAlert, ShieldCheck, Eye } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface UserProfile {
  id: string;
  email: string;
  role: 'admin' | 'sales_manager' | 'sales_rep' | 'read_only';
  first_name: string | null;
  last_name: string | null;
  created_at: string;
}

export function UserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: userData } = await supabase.auth.admin.getUserById(user.id);
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    
    if (profile && userData?.user) {
      setCurrentUser({
        ...profile,
        email: userData.user.email!,
      } as UserProfile);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === 'PGRST301') {
          return;
        }
        throw error;
      }

      const usersWithEmails = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: userData } = await supabase.auth.admin.getUserById(profile.id);
          return {
            ...profile,
            email: userData?.user?.email || 'Unknown',
          } as UserProfile;
        })
      );

      setUsers(usersWithEmails);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: 'admin' | 'sales_manager' | 'sales_rep' | 'read_only') => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      toast.success('User role updated successfully');
      loadUsers();
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error('Failed to update user role');
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
    <Card>
      <CardHeader>
        <CardTitle>User Management</CardTitle>
        <CardDescription>
          Manage user roles and security clearances. Only administrators can modify user permissions.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No users found</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    {user.first_name && user.last_name 
                      ? `${user.first_name} ${user.last_name}`
                      : 'N/A'}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{user.email}</TableCell>
                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                  <TableCell>
                    {user.id === currentUser?.id ? (
                      <span className="text-sm text-muted-foreground">You</span>
                    ) : (
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
                    )}
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
  );
}
