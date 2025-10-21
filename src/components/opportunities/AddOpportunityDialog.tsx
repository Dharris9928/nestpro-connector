import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserAssignmentSelect } from "@/components/companies/UserAssignmentSelect";
import { SalesRepSelect } from "@/components/companies/SalesRepSelect";
import { CompanySearchSelect } from "@/components/opportunities/CompanySearchSelect";
import { ContractorSearchSelect } from "@/components/opportunities/ContractorSearchSelect";
import { OpportunityProductsForm } from "@/components/opportunities/OpportunityProductsForm";

const opportunitySchema = z.object({
  company_id: z.string().min(1, "Company is required"),
  assigned_to: z.string().optional(),
  contractor_id: z.string().optional(),
  opportunity_name: z.string().min(1, "Opportunity name is required"),
  status: z.enum(["Open", "Proposal", "Committed", "Purchased", "Declined"]),
  estimated_value: z.string().optional(),
  expected_close_date: z.string().optional(),
  notes: z.string().optional(),
});

type OpportunityProduct = {
  product_type: "Thermostat" | "Doorbell" | "Camera";
  model: string;
  quantity: number;
};

interface AddOpportunityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefilledCompanyId?: string;
}

export function AddOpportunityDialog({ open, onOpenChange, prefilledCompanyId }: AddOpportunityDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [products, setProducts] = useState<OpportunityProduct[]>([]);

  const form = useForm<z.infer<typeof opportunitySchema>>({
    resolver: zodResolver(opportunitySchema),
    defaultValues: {
      status: "Open",
      company_id: prefilledCompanyId || "",
    },
  });

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  // Update form when prefilledCompanyId changes
  useEffect(() => {
    if (prefilledCompanyId && open) {
      form.setValue('company_id', prefilledCompanyId);
    }
  }, [prefilledCompanyId, open, form]);

  const createOpportunity = useMutation({
    mutationFn: async (values: z.infer<typeof opportunitySchema>) => {
      if (!currentUser) throw new Error("User not authenticated");

      // Create opportunity
      const { data: opportunity, error: oppError } = await supabase
        .from('opportunities' as any)
        .insert({
          ...values,
          estimated_value: values.estimated_value ? parseFloat(values.estimated_value) : null,
          contractor_id: values.contractor_id || null,
          created_by: currentUser.id,
        })
        .select()
        .single();

      if (oppError) throw oppError;

      // Create products
      if (products.length > 0) {
        const { error: productsError } = await supabase
          .from('opportunity_products' as any)
          .insert(
            products.map(p => ({
              opportunity_id: (opportunity as any).id,
              ...p,
            }))
          );

        if (productsError) throw productsError;
      }

      return opportunity as any;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      toast({
        title: "Success",
        description: "Opportunity created successfully",
      });
      form.reset();
      setProducts([]);
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create opportunity: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: z.infer<typeof opportunitySchema>) => {
    createOpportunity.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Opportunity</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="company_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company *</FormLabel>
                  <FormControl>
                    <CompanySearchSelect
                      value={field.value}
                      onValueChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="opportunity_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Opportunity Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Q1 2025 Smart Home Installation" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Open">Open</SelectItem>
                        <SelectItem value="Proposal">Proposal</SelectItem>
                        <SelectItem value="Committed">Committed</SelectItem>
                        <SelectItem value="Purchased">Purchased</SelectItem>
                        <SelectItem value="Declined">Declined</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="assigned_to"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned To</FormLabel>
                    <FormControl>
                      <SalesRepSelect
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Select sales rep..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="contractor_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contractor (Optional)</FormLabel>
                  <FormControl>
                    <ContractorSearchSelect
                      value={field.value}
                      onValueChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="estimated_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estimated Value ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="15000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expected_close_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expected Close Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional information about this opportunity..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <OpportunityProductsForm products={products} setProducts={setProducts} />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createOpportunity.isPending}>
                {createOpportunity.isPending ? "Creating..." : "Create Opportunity"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
