import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  date_received: z.string().min(1, "Date received is required"),
  date_won: z.string().optional(),
  status: z.enum(["pending", "won", "lost"]),
  distributor_id: z.string().optional(),
  wholesaler_id: z.string().optional(),
  product: z.string().optional(),
  quantity: z.coerce.number().min(1).optional(),
  price: z.coerce.number().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface JobQuoteContact {
  contact_id: string;
  contact_type: "wholesale_personnel" | "nest_field_team" | "distributor_personnel" | "customer";
}

interface EditJobQuoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: any;
}

export function EditJobQuoteDialog({ open, onOpenChange, quote }: EditJobQuoteDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [contacts, setContacts] = useState<JobQuoteContact[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date_received: "",
      status: "pending",
      quantity: 1,
    },
  });

  // Populate form when quote changes
  useEffect(() => {
    if (quote) {
      form.reset({
        date_received: quote.date_received?.split("T")[0] || "",
        date_won: quote.date_won?.split("T")[0] || "",
        status: quote.status || "pending",
        distributor_id: quote.distributor_id || "",
        wholesaler_id: quote.wholesaler_id || "",
        product: quote.product || "",
        quantity: quote.quantity || 1,
        price: quote.price || undefined,
        notes: quote.notes || "",
      });

      // Load existing contacts
      const existingContacts = quote.job_quote_contacts?.map((jqc: any) => ({
        contact_id: jqc.contact?.id || jqc.contact_id,
        contact_type: jqc.contact_type,
      })) || [];
      setContacts(existingContacts);
    }
  }, [quote, form]);

  const updateMutation = useMutation({
    mutationFn: async (values: FormData) => {
      // Update job quote
      const { error: quoteError } = await supabase
        .from("job_quotes")
        .update({
          date_received: values.date_received,
          date_won: values.status === "won" && values.date_won ? values.date_won : null,
          status: values.status,
          distributor_id: values.distributor_id || null,
          wholesaler_id: values.wholesaler_id || null,
          product: values.product || null,
          quantity: values.quantity || 1,
          price: values.price || null,
          notes: values.notes || null,
        })
        .eq("id", quote.id);

      if (quoteError) throw quoteError;

      // Delete existing contacts and re-add
      await supabase
        .from("job_quote_contacts")
        .delete()
        .eq("job_quote_id", quote.id);

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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-quotes"] });
      toast({ title: "Job quote updated successfully" });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error updating job quote",
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
          <DialogTitle>Edit Job Quote</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => updateMutation.mutate(data))}
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
                      value={field.value}
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

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="product"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Product name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price (optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Contacts Manager */}
            <div className="space-y-2">
              <FormLabel>Contacts (optional)</FormLabel>
              <JobQuoteContactsManager
                contacts={contacts}
                onChange={setContacts}
              />
            </div>

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
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
