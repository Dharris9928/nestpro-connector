import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AddSalesRepDialog } from "./AddSalesRepDialog";
import { EditSalesRepDialog } from "./EditSalesRepDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function SalesRepManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingSalesRep, setEditingSalesRep] = useState<any>(null);
  const [deletingSalesRep, setDeletingSalesRep] = useState<any>(null);

  const { data: salesReps, isLoading } = useQuery({
    queryKey: ['sales-reps'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_reps' as any)
        .select('*')
        .order('last_name');

      if (error) throw error;
      return data as any;
    },
  });

  const deleteSalesRep = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sales_reps' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-reps'] });
      toast({
        title: "Success",
        description: "Sales rep deleted successfully",
      });
      setDeletingSalesRep(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete sales rep: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <div className="p-4">Loading sales reps...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Sales Rep Database</h3>
          <p className="text-sm text-muted-foreground">
            Manage sales personnel who are not users in the system
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Sales Rep
        </Button>
      </div>

      {salesReps && salesReps.length > 0 ? (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Territory</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salesReps.map((rep: any) => (
                <TableRow key={rep.id}>
                  <TableCell className="font-medium">
                    {rep.first_name} {rep.last_name}
                  </TableCell>
                  <TableCell>{rep.email}</TableCell>
                  <TableCell>{rep.phone || "—"}</TableCell>
                  <TableCell>{rep.territory || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={rep.active ? "default" : "secondary"}>
                      {rep.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {rep.notes || "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingSalesRep(rep)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingSalesRep(rep)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-12 border rounded-lg">
          <p className="text-muted-foreground">No sales reps found</p>
          <p className="text-sm text-muted-foreground mt-1">
            Add your first sales rep to get started
          </p>
        </div>
      )}

      <AddSalesRepDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
      />

      {editingSalesRep && (
        <EditSalesRepDialog
          open={!!editingSalesRep}
          onOpenChange={(open) => !open && setEditingSalesRep(null)}
          salesRep={editingSalesRep}
        />
      )}

      <AlertDialog
        open={!!deletingSalesRep}
        onOpenChange={(open) => !open && setDeletingSalesRep(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sales Rep</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deletingSalesRep?.first_name}{" "}
              {deletingSalesRep?.last_name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteSalesRep.mutate(deletingSalesRep.id)}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
