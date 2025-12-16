import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface UnifiedAssignmentSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  /** If true, returns raw UUIDs instead of prefixed IDs (user:xxx, salesrep:xxx) */
  rawIds?: boolean;
}

export function UnifiedAssignmentSelect({ value, onValueChange, placeholder = "Select assignee...", rawIds = false }: UnifiedAssignmentSelectProps) {
  const { data: systemUsers, isLoading: loadingUsers } = useQuery({
    queryKey: ['users-for-assignment'],
    queryFn: async () => {
      // Get all approved profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, approval_status')
        .eq('approval_status', 'approved')
        .order('first_name');

      if (profilesError) throw profilesError;
      if (!profiles) return [];

      // Get roles for these users
      const userIds = profiles.map(p => p.id);
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds)
        .in('role', ['sales_rep', 'sales_manager', 'admin']);

      if (rolesError) throw rolesError;

      // Filter profiles to only include users with the required roles
      const roleUserIds = new Set(roles?.map(r => r.user_id) || []);
      return profiles.filter(p => roleUserIds.has(p.id)).map(p => ({
        id: rawIds ? p.id : `user:${p.id}`,
        name: `${p.first_name} ${p.last_name}`,
        type: 'System User' as const
      }));
    },
  });

  const { data: salesReps, isLoading: loadingReps } = useQuery({
    queryKey: ['sales-reps-for-assignment'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_reps' as any)
        .select('id, first_name, last_name, active')
        .eq('active', true)
        .order('first_name');

      if (error) throw error;
      return (data as any)?.map((rep: any) => ({
        id: rawIds ? rep.id : `salesrep:${rep.id}`,
        name: `${rep.first_name} ${rep.last_name}`,
        type: 'External Sales Rep' as const
      })) || [];
    },
  });

  const isLoading = loadingUsers || loadingReps;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-2">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  const allAssignees = [...(systemUsers || []), ...(salesReps || [])];

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-card z-[100]">
        <SelectItem value="unassigned">Unassigned</SelectItem>
        
        {systemUsers && systemUsers.length > 0 && (
          <>
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
              System Users
            </div>
            {systemUsers.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.name}
              </SelectItem>
            ))}
          </>
        )}
        
        {salesReps && salesReps.length > 0 && (
          <>
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
              External Sales Reps
            </div>
            {salesReps.map((rep) => (
              <SelectItem key={rep.id} value={rep.id}>
                {rep.name}
              </SelectItem>
            ))}
          </>
        )}
      </SelectContent>
    </Select>
  );
}
