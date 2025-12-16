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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UnifiedAssignmentSelect } from "@/components/companies/UnifiedAssignmentSelect";
import { CompanySearchSelect } from "@/components/opportunities/CompanySearchSelect";
import { ContractorSearchSelect } from "@/components/opportunities/ContractorSearchSelect";
import { OpportunityProductsForm } from "@/components/opportunities/OpportunityProductsForm";
import { ContactMultiSelect } from "@/components/common/ContactMultiSelect";

const opportunitySchema = z.object({
  company_id: z.string().min(1, "Company is required"),
  assigned_to: z.string().optional(),
  contractor_id: z.string().optional(),
  opportunity_name: z.string().min(1, "Opportunity name is required"),
  stage: z.enum(["Open", "Proposal", "Committed", "Purchased", "Declined"]),
  amount: z.string().optional(),
  expected_close_date: z.string().optional(),
  confidence: z.string().optional(),
  unit_needed_date: z.string().optional(),
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
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);

  const form = useForm<z.infer<typeof opportunitySchema>>({
    resolver: zodResolver(opportunitySchema),
    defaultValues: {
      stage: "Open",
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

  // Fetch contacts for the selected company
  const companyId = form.watch('company_id');
  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts-for-opportunity', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, title')
        .eq('company_id', companyId)
        .order('first_name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
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
          amount: values.amount ? parseFloat(values.amount) : null,
          confidence: values.confidence ? parseInt(values.confidence) : null,
          assigned_to: values.assigned_to === "unassigned" ? null : (values.assigned_to || null),
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

      // Create contact associations
      if (selectedContactIds.length > 0) {
        const { error: contactsError } = await supabase
          .from('opportunity_contacts')
          .insert(
            selectedContactIds.map(contactId => ({
              opportunity_id: (opportunity as any).id,
              contact_id: contactId,
            }))
          );

        if (contactsError) throw contactsError;
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
      setSelectedContactIds([]);
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
                name="stage"
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
                      <UnifiedAssignmentSelect
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Select assignee..."
                        rawIds={true}
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

            {/* Contacts */}
            {companyId && (
              <div className="space-y-2">
                <Label>Contacts (Optional)</Label>
                <ContactMultiSelect
                  contacts={contacts}
                  selectedContactIds={selectedContactIds}
                  onSelectedContactsChange={setSelectedContactIds}
                  placeholder="Select contacts..."
                />
                <p className="text-xs text-muted-foreground">
                  Link contacts to this opportunity for tracking
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estimated Value ($) <span className="text-muted-foreground font-normal">(Optional)</span></FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="15000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confidence"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confidence</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select confidence..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Array.from({ length: 21 }, (_, i) => i * 5).map((value) => (
                          <SelectItem key={value} value={String(value)}>
                            {value}%
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
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

              <FormField
                control={form.control}
                name="unit_needed_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit Needed Date</FormLabel>
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
