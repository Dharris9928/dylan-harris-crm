import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface Opportunity {
  id: string;
  opportunity_name: string;
  stage: string;
  amount: number | null;
  expected_close_date: string | null;
  notes: string | null;
  created_at: string;
  companies?: { company_name: string } | null;
  profiles?: { first_name: string; last_name: string } | null;
  opportunity_products?: any[];
}

interface OpportunitiesTableProps {
  opportunities: Opportunity[];
  isLoading: boolean;
  onSelectOpportunity?: (opportunity: Opportunity) => void;
}

const statusColors: Record<string, string> = {
  prospecting: "bg-blue-500",
  qualification: "bg-yellow-500",
  proposal: "bg-purple-500",
  negotiation: "bg-orange-500",
  closed_won: "bg-green-500",
  closed_lost: "bg-red-500",
};

export function OpportunitiesTable({ opportunities, isLoading, onSelectOpportunity }: OpportunitiesTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (opportunities.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg">
        <p className="text-muted-foreground">No opportunities found</p>
        <p className="text-sm text-muted-foreground mt-1">
          Create your first opportunity to get started
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Opportunity Name</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead>Products</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Assigned To</TableHead>
            <TableHead>Expected Close</TableHead>
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {opportunities.map((opportunity) => (
            <TableRow 
              key={opportunity.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onSelectOpportunity?.(opportunity)}
            >
              <TableCell className="font-medium">
                {opportunity.opportunity_name}
              </TableCell>
              <TableCell>{opportunity.companies?.company_name || "N/A"}</TableCell>
              <TableCell>
                <Badge className={statusColors[opportunity.stage] || "bg-muted"}>
                  {opportunity.stage}
                </Badge>
              </TableCell>
              <TableCell>
                {opportunity.opportunity_products?.length ? (
                  <div className="text-sm">
                    {opportunity.opportunity_products?.map((p, i) => (
                      <div key={i}>
                        {p.quantity}x {p.product_type}
                        {p.model && ` (${p.model})`}
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground">No products</span>
                )}
              </TableCell>
              <TableCell>
                {opportunity.amount !== null && opportunity.amount !== undefined
                  ? `$${Number(opportunity.amount).toLocaleString()}`
                  : "—"}
              </TableCell>
              <TableCell>
                {opportunity.profiles
                  ? `${opportunity.profiles.first_name} ${opportunity.profiles.last_name}`
                  : "Unassigned"}
              </TableCell>
              <TableCell>
                {opportunity.expected_close_date
                  ? format(new Date(opportunity.expected_close_date), "MMM d, yyyy")
                  : "—"}
              </TableCell>
              <TableCell className="max-w-xs">
                {opportunity.notes ? (
                  <span className="text-sm text-muted-foreground truncate block">
                    {opportunity.notes}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
