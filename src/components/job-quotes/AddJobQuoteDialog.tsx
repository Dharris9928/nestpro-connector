import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { useToast } from "@/hooks/use-toast";
import { CompanySearchOrCreate } from "@/components/job-quotes/CompanySearchOrCreate";
import { JobQuoteContactsManager } from "@/components/job-quotes/JobQuoteContactsManager";
import { ProductLineItems, type ProductLineItem } from "@/components/shared/ProductLineItems";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  date_received: z.string().min(1, "Date received is required"),
  date_won: z.string().optional(),
  status: z.enum(["pending", "won", "lost"]),
  distributor_id: z.string().optional(),
  wholesaler_id: z.string().optional(),
  contractor_id: z.string().optional(),
  notes: z.string().optional(),
  comments: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface JobQuoteContact {
  contact_id: string;
  contact_type: "wholesale_personnel" | "nest_field_team" | "distributor_personnel" | "customer";
}

interface AddJobQuoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddJobQuoteDialog({ open, onOpenChange }: AddJobQuoteDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [contacts, setContacts] = useState<JobQuoteContact[]>([]);
  const [products, setProducts] = useState<ProductLineItem[]>([]);

  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date_received: new Date().toISOString().split("T")[0],
      status: "pending",
    },
  });

  const grandTotal = products.reduce((sum, p) => sum + p.quantity * p.unit_price, 0);

  const createMutation = useMutation({
    mutationFn: async (values: FormData) => {
      if (!currentUser) throw new Error("User not authenticated");

      const { data: quote, error: quoteError } = await supabase
        .from("job_quotes")
        .insert({
          date_received: values.date_received,
          date_won: values.status === "won" && values.date_won ? values.date_won : null,
          status: values.status,
          distributor_id: values.distributor_id || null,
          wholesaler_id: values.wholesaler_id || null,
          contractor_id: values.contractor_id || null,
          product: products.length > 0 ? products.map(p => p.product_name).join(", ") : null,
          quantity: products.reduce((sum, p) => sum + p.quantity, 0) || 1,
          price: grandTotal || null,
          notes: values.notes || null,
          comments: values.comments || null,
          created_by: currentUser.id,
        })
        .select()
        .single();

      if (quoteError) throw quoteError;

      // Create product line items
      if (products.length > 0) {
        const { error: productsError } = await supabase
          .from("job_quote_products")
          .insert(
            products.map((p) => ({
              job_quote_id: quote.id,
              product_name: p.product_name,
              quantity: p.quantity,
              unit_price: p.unit_price,
            }))
          );
        if (productsError) throw productsError;
      }

      // Create contact associations
      if (contacts.length > 0) {
        const { error: contactsError } = await supabase
          .from("job_quote_contacts")
          .insert(
            contacts.map((c) => ({
              job_quote_id: quote.id,
              contact_id: c.contact_id,
              contact_type: c.contact_type,
            }))
          );
        if (contactsError) throw contactsError;
      }

      return quote;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-quotes"] });
      toast({ title: "Job quote created successfully" });
      form.reset();
      setContacts([]);
      setProducts([]);
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error creating job quote",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const status = form.watch("status");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Job Quote</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => createMutation.mutate(data))}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date_received"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date Received *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="won">Won</SelectItem>
                        <SelectItem value="lost">Lost</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {status === "won" && (
              <FormField
                control={form.control}
                name="date_won"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date Won</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="distributor_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Distributor</FormLabel>
                    <FormControl>
                      <CompanySearchOrCreate
                        value={field.value}
                        onChange={field.onChange}
                        companyType="Distributor"
                        placeholder="Search or create distributor..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="wholesaler_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Wholesaler</FormLabel>
                    <FormControl>
                      <CompanySearchOrCreate
                        value={field.value}
                        onChange={field.onChange}
                        companyType="Wholesaler"
                        placeholder="Search or create wholesaler..."
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
                  <FormLabel>Contractor</FormLabel>
                  <FormControl>
                    <CompanySearchOrCreate
                      value={field.value}
                      onChange={field.onChange}
                      companyType="Contractor"
                      placeholder="Search or create contractor..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Product Line Items */}
            <ProductLineItems items={products} setItems={setProducts} />

            {/* Contacts Manager */}
            <div className="space-y-2">
              <FormLabel>Contacts (optional)</FormLabel>
              <JobQuoteContactsManager
                contacts={contacts}
                onChange={setContacts}
                distributorId={form.watch("distributor_id")}
                wholesalerId={form.watch("wholesaler_id")}
              />
            </div>

            <FormField
              control={form.control}
              name="comments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comments</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Comments about this quote..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Additional notes..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Create Quote
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
