import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create client with service role for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify user is authenticated and is admin
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }
    
    // Check if user is admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();
    
    if (roleError || !roleData) {
      throw new Error('Forbidden - Admin access required');
    }
    
    const { operation, sql, tableName } = await req.json();
    
    let result;
    
    switch (operation) {
      case 'list_tables':
        // Get all tables in public schema
        const { data: tables, error: tablesError } = await supabaseAdmin
          .rpc('get_table_list');
        
        if (tablesError) {
          // Fallback to direct query
          const { data: tableData, error: directError } = await supabaseAdmin
            .from('information_schema.tables')
            .select('table_name')
            .eq('table_schema', 'public')
            .order('table_name');
          
          if (directError) throw directError;
          result = tableData;
        } else {
          result = tables;
        }
        break;
        
      case 'get_table_structure':
        // Get column information for a table
        const { data: columns, error: columnsError } = await supabaseAdmin
          .rpc('get_table_columns', { table_name_param: tableName });
        
        if (columnsError) throw columnsError;
        result = columns;
        break;
        
      case 'execute_sql':
        // Execute custom SQL (CREATE, ALTER, DROP)
        const { data: sqlResult, error: sqlError } = await supabaseAdmin
          .rpc('execute_admin_sql', { sql_query: sql });
        
        if (sqlError) throw sqlError;
        result = sqlResult;
        break;
        
      default:
        throw new Error('Invalid operation');
    }
    
    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Database management error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        status: errorMessage.includes('Unauthorized') ? 401 : 
                errorMessage.includes('Forbidden') ? 403 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});