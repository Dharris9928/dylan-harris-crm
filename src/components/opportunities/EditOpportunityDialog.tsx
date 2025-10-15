import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Building2, Calendar, DollarSign, User, Package } from "lucide-react";

interface EditOpportunityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunity: any;
}

const statusColors: Record<string, string> = {
  prospecting: 'bg-blue-500',
  qualification: 'bg-purple-500',
  proposal: 'bg-yellow-500',
  negotiation: 'bg-orange-500',
  closed_won: 'bg-green-500',
  closed_lost: 'bg-red-500',
};

export function EditOpportunityDialog({ open, onOpenChange, opportunity }: EditOpportunityDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{opportunity.opportunity_name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Stage</label>
            <div className="mt-1">
              <Badge className={statusColors[opportunity.stage]}>
                {opportunity.stage?.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Company
              </label>
              <p className="text-sm text-muted-foreground mt-1">
                {opportunity.companies?.company_name || 'No Company'}
              </p>
            </div>

            {opportunity.amount && (
              <div>
                <label className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Value
                </label>
                <p className="text-sm text-muted-foreground mt-1">
                  ${opportunity.amount.toLocaleString()}
                </p>
              </div>
            )}

            {opportunity.expected_close_date && (
              <div>
                <label className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Expected Close
                </label>
                <p className="text-sm text-muted-foreground mt-1">
                  {format(new Date(opportunity.expected_close_date), 'MMM d, yyyy')}
                </p>
              </div>
            )}

            {opportunity.profiles && (
              <div>
                <label className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Assigned To
                </label>
                <p className="text-sm text-muted-foreground mt-1">
                  {opportunity.profiles.first_name} {opportunity.profiles.last_name}
                </p>
              </div>
            )}
          </div>

          {opportunity.opportunity_products?.length > 0 && (
            <div>
              <label className="text-sm font-medium flex items-center gap-2 mb-2">
                <Package className="h-4 w-4" />
                Products
              </label>
              <div className="border rounded-lg p-3 space-y-2">
                {opportunity.opportunity_products.map((product: any, index: number) => (
                  <div key={index} className="flex justify-between items-center text-sm">
                    <span>
                      {product.quantity}x {product.product_type}
                      {product.model && ` (${product.model})`}
                    </span>
                    {product.unit_price && (
                      <span className="font-medium">
                        ${(product.quantity * product.unit_price).toLocaleString()}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {opportunity.notes && (
            <div>
              <label className="text-sm font-medium">Notes</label>
              <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                {opportunity.notes}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
