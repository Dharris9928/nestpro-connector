import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Database, Plus, Trash2, Edit, Play, Table } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TableInfo {
  table_name: string;
}

interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string;
}

export function DatabaseManagement() {
  const queryClient = useQueryClient();
  const [sqlQuery, setSqlQuery] = useState("");
  const [createTableDialog, setCreateTableDialog] = useState(false);
  const [newTableName, setNewTableName] = useState("");
  const [columns, setColumns] = useState<Array<{name: string, type: string, nullable: boolean}>>([
    { name: "id", type: "uuid", nullable: false },
    { name: "created_at", type: "timestamptz", nullable: false },
  ]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  // Fetch tables
  const { data: tables, isLoading: tablesLoading } = useQuery({
    queryKey: ['admin-tables'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-database-management`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ operation: 'list_tables' }),
        }
      );

      if (!response.ok) throw new Error('Failed to fetch tables');
      const result = await response.json();
      return result.data as TableInfo[];
    },
  });

  // Fetch table structure
  const { data: tableStructure } = useQuery({
    queryKey: ['table-structure', selectedTable],
    queryFn: async () => {
      if (!selectedTable) return null;
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-database-management`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            operation: 'get_table_structure',
            tableName: selectedTable 
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to fetch table structure');
      const result = await response.json();
      return result.data as ColumnInfo[];
    },
    enabled: !!selectedTable,
  });

  // Execute SQL mutation
  const executeSqlMutation = useMutation({
    mutationFn: async (sql: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-database-management`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            operation: 'execute_sql',
            sql 
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to execute SQL');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast.success("SQL executed successfully");
      queryClient.invalidateQueries({ queryKey: ['admin-tables'] });
      setSqlQuery("");
    },
    onError: (error: Error) => {
      toast.error(`SQL execution failed: ${error.message}`);
    },
  });

  const handleCreateTable = () => {
    const columnDefs = columns.map(col => 
      `${col.name} ${col.type}${col.nullable ? '' : ' NOT NULL'}${col.name === 'id' ? ' PRIMARY KEY DEFAULT gen_random_uuid()' : col.name === 'created_at' ? ' DEFAULT now()' : ''}`
    ).join(',\n  ');

    const sql = `CREATE TABLE public.${newTableName} (
  ${columnDefs}
);

ALTER TABLE public.${newTableName} ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage ${newTableName}"
ON public.${newTableName}
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));`;

    executeSqlMutation.mutate(sql);
    setCreateTableDialog(false);
    setNewTableName("");
    setColumns([
      { name: "id", type: "uuid", nullable: false },
      { name: "created_at", type: "timestamptz", nullable: false },
    ]);
  };

  const handleDeleteTable = (tableName: string) => {
    if (!confirm(`Are you sure you want to delete table "${tableName}"? This cannot be undone.`)) {
      return;
    }
    
    const sql = `DROP TABLE IF EXISTS public.${tableName} CASCADE;`;
    executeSqlMutation.mutate(sql);
  };

  const addColumn = () => {
    setColumns([...columns, { name: "", type: "text", nullable: true }]);
  };

  const removeColumn = (index: number) => {
    setColumns(columns.filter((_, i) => i !== index));
  };

  const updateColumn = (index: number, field: string, value: any) => {
    const updated = [...columns];
    updated[index] = { ...updated[index], [field]: value };
    setColumns(updated);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Management
          </CardTitle>
          <CardDescription>
            Admin-only interface to manage database tables directly
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="tables">
            <TabsList>
              <TabsTrigger value="tables">Tables</TabsTrigger>
              <TabsTrigger value="sql">SQL Editor</TabsTrigger>
            </TabsList>

            <TabsContent value="tables" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Database Tables</h3>
                <Button onClick={() => setCreateTableDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Table
                </Button>
              </div>

              {tablesLoading ? (
                <p>Loading tables...</p>
              ) : (
                <div className="grid gap-4">
                  {tables?.map((table) => (
                    <Card key={table.table_name}>
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Table className="h-4 w-4" />
                            <span className="font-mono">{table.table_name}</span>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedTable(table.table_name)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteTable(table.table_name)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        {selectedTable === table.table_name && tableStructure && (
                          <div className="mt-4 border-t pt-4">
                            <h4 className="font-semibold mb-2">Columns:</h4>
                            <div className="space-y-2">
                              {tableStructure.map((col) => (
                                <div key={col.column_name} className="flex justify-between text-sm font-mono">
                                  <span>{col.column_name}</span>
                                  <span className="text-muted-foreground">
                                    {col.data_type} {col.is_nullable === 'NO' && '(NOT NULL)'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="sql" className="space-y-4">
              <div>
                <Label htmlFor="sql">SQL Query</Label>
                <Textarea
                  id="sql"
                  placeholder="Enter SQL query (CREATE, ALTER, DROP, etc.)"
                  value={sqlQuery}
                  onChange={(e) => setSqlQuery(e.target.value)}
                  rows={10}
                  className="font-mono"
                />
              </div>
              <Button 
                onClick={() => executeSqlMutation.mutate(sqlQuery)}
                disabled={!sqlQuery || executeSqlMutation.isPending}
              >
                <Play className="h-4 w-4 mr-2" />
                Execute SQL
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={createTableDialog} onOpenChange={setCreateTableDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Table</DialogTitle>
            <DialogDescription>
              Define your table structure. Default RLS policies will be created.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="tableName">Table Name</Label>
              <Input
                id="tableName"
                value={newTableName}
                onChange={(e) => setNewTableName(e.target.value)}
                placeholder="my_table"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Columns</Label>
                <Button size="sm" variant="outline" onClick={addColumn}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Column
                </Button>
              </div>

              {columns.map((col, index) => (
                <div key={index} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Input
                      placeholder="Column name"
                      value={col.name}
                      onChange={(e) => updateColumn(index, 'name', e.target.value)}
                      disabled={index < 2}
                    />
                  </div>
                  <div className="w-40">
                    <Select
                      value={col.type}
                      onValueChange={(value) => updateColumn(index, 'type', value)}
                      disabled={index < 2}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">text</SelectItem>
                        <SelectItem value="integer">integer</SelectItem>
                        <SelectItem value="bigint">bigint</SelectItem>
                        <SelectItem value="uuid">uuid</SelectItem>
                        <SelectItem value="boolean">boolean</SelectItem>
                        <SelectItem value="jsonb">jsonb</SelectItem>
                        <SelectItem value="timestamptz">timestamptz</SelectItem>
                        <SelectItem value="date">date</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-24">
                    <Select
                      value={col.nullable ? "nullable" : "not_null"}
                      onValueChange={(value) => updateColumn(index, 'nullable', value === "nullable")}
                      disabled={index < 2}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="not_null">NOT NULL</SelectItem>
                        <SelectItem value="nullable">Nullable</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {index >= 2 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeColumn(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateTableDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateTable}
              disabled={!newTableName || executeSqlMutation.isPending}
            >
              Create Table
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}