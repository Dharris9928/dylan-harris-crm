import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface CompanyOpportunitiesTabProps {
  companyId: string;
}

const statusColors: Record<string, string> = {
  "Open": "bg-blue-500",
  "Proposal": "bg-yellow-500",
  "Committed": "bg-purple-500",
  "Purchased": "bg-green-500",
  "Declined": "bg-red-500",
};

export function CompanyOpportunitiesTab({ companyId }: CompanyOpportunitiesTabProps) {
  const { data: opportunities, isLoading } = useQuery({
    queryKey: ['company-opportunities', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('opportunities' as any)
        .select(`
          *,
          profiles!opportunities_assigned_to_fkey(first_name, last_name),
          opportunity_products(*)
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as any;
    },
  });

  if (isLoading) {
    return <div className="p-4">Loading opportunities...</div>;
  }

  if (!opportunities || opportunities.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <p>No opportunities found for this company</p>
        <p className="text-sm mt-1">Create an opportunity to get started</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
            <TableHead>Opportunity Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Products</TableHead>
            <TableHead>Estimated Value</TableHead>
            <TableHead>Assigned To</TableHead>
            <TableHead>Expected Close</TableHead>
            <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {opportunities.map((opportunity: any) => (
              <TableRow key={opportunity.id}>
                <TableCell className="font-medium">
                  {opportunity.opportunity_name}
                </TableCell>
                <TableCell>
                  <Badge className={statusColors[opportunity.status]}>
                    {opportunity.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {opportunity.opportunity_products.length > 0 ? (
                    <div className="text-sm">
                      {opportunity.opportunity_products.map((p: any, i: number) => (
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
                  {opportunity.estimated_value
                    ? `$${opportunity.estimated_value.toLocaleString()}`
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
    </div>
  );
}
