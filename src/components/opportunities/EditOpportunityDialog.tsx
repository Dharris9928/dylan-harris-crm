import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { CompanySearchSelect } from "./CompanySearchSelect";
import { SalesRepSelect } from "../companies/SalesRepSelect";
import { ContractorSearchSelect } from "./ContractorSearchSelect";

interface EditOpportunityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunity: any;
}

export function EditOpportunityDialog({ open, onOpenChange, opportunity }: EditOpportunityDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    company_id: "",
    opportunity_name: "",
    status: "Open",
    amount: "",
    expected_close_date: "",
    assigned_to: "",
    contractor_id: "",
    notes: "",
  });

  // Initialize form data when opportunity changes
  useEffect(() => {
    if (opportunity && open) {
      setFormData({
        company_id: opportunity.company_id || "",
        opportunity_name: opportunity.opportunity_name || "",
        status: opportunity.stage || "Open",
        amount: opportunity.amount ? String(opportunity.amount) : "",
        expected_close_date: opportunity.expected_close_date || "",
        assigned_to: opportunity.assigned_to || "",
        contractor_id: opportunity.contractor_id || "",
        notes: opportunity.notes || "",
      });
    }
  }, [opportunity, open]);

  const updateOpportunity = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('opportunities' as any)
        .update({
          company_id: formData.company_id,
          opportunity_name: formData.opportunity_name,
          stage: formData.status,
          amount: formData.amount ? parseFloat(formData.amount) : null,
          expected_close_date: formData.expected_close_date || null,
          assigned_to: formData.assigned_to || null,
          contractor_id: formData.contractor_id || null,
          notes: formData.notes || null,
        })
        .eq('id', opportunity.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      toast({
        title: "Success",
        description: "Opportunity updated successfully",
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update opportunity: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateOpportunity.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Opportunity</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="company_id">Company *</Label>
            <CompanySearchSelect
              value={formData.company_id}
              onValueChange={(value) => setFormData({ ...formData, company_id: value })}
            />
          </div>

          <div>
            <Label htmlFor="opportunity_name">Opportunity Name *</Label>
            <Input
              id="opportunity_name"
              value={formData.opportunity_name}
              onChange={(e) => setFormData({ ...formData, opportunity_name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="status">Status *</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Open">Open</SelectItem>
                  <SelectItem value="Proposal">Proposal</SelectItem>
                  <SelectItem value="Committed">Committed</SelectItem>
                  <SelectItem value="Purchased">Purchased</SelectItem>
                  <SelectItem value="Declined">Declined</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="assigned_to">Assigned To</Label>
              <SalesRepSelect
                value={formData.assigned_to}
                onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="contractor_id">Contractor (Optional)</Label>
            <ContractorSearchSelect
              value={formData.contractor_id}
              onValueChange={(value) => setFormData({ ...formData, contractor_id: value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount">
                Estimated Value ($) <span className="text-muted-foreground font-normal">(Optional)</span>
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="15000"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="expected_close_date">Expected Close Date</Label>
              <Input
                id="expected_close_date"
                type="date"
                value={formData.expected_close_date}
                onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional information about this opportunity..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateOpportunity.isPending}>
              {updateOpportunity.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}