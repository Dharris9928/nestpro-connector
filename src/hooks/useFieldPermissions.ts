import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface FieldPermission {
  table_name: string;
  field_name: string;
  min_role_required: string;
  is_pii: boolean;
  masking_pattern: string | null;
}

export function useFieldPermissions() {
  const { data: permissions, isLoading } = useQuery({
    queryKey: ['field-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('field_permissions')
        .select('*');
      
      if (error) throw error;
      return data as FieldPermission[];
    },
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
  });

  const { data: userRole } = useQuery({
    queryKey: ['user-role'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return data.role as string;
    },
    staleTime: 5 * 60 * 1000,
  });

  const canAccessField = (tableName: string, fieldName: string): boolean => {
    if (!permissions || !userRole) return true;

    const permission = permissions.find(
      p => p.table_name === tableName && p.field_name === fieldName
    );

    if (!permission) return true;

    const roleHierarchy: Record<string, number> = {
      'read_only': 1,
      'sales_rep': 2,
      'sales_manager': 3,
      'admin': 4
    };

    const userLevel = roleHierarchy[userRole] || 0;
    const requiredLevel = roleHierarchy[permission.min_role_required] || 0;

    return userLevel >= requiredLevel;
  };

  const maskField = (value: string, tableName: string, fieldName: string): string => {
    if (!permissions || !value) return value;

    const permission = permissions.find(
      p => p.table_name === tableName && p.field_name === fieldName && p.is_pii
    );

    if (!permission || canAccessField(tableName, fieldName)) return value;

    // Apply masking based on field type
    if (fieldName.includes('email')) {
      const [local, domain] = value.split('@');
      if (!domain) return '***@***.com';
      const domainParts = domain.split('.');
      return `${local[0]}***@${domainParts[0][0]}***.${domainParts[domainParts.length - 1]}`;
    } else if (fieldName.includes('phone') || fieldName.includes('mobile')) {
      return `(***) ***-${value.slice(-4)}`;
    }

    return '***';
  };

  return {
    canAccessField,
    maskField,
    isLoading,
    userRole
  };
}
