import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Edit } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Company {
  id: string;
  company_name: string;
  industry_type: string;
  builder_segment: string | null;
  contractor_segment: string | null;
  status: string;
  lead_score: number;
  priority_tier: string | null;
  website_url: string | null;
  primary_phone: string | null;
  is_franchise: boolean;
  parent_company_id: string | null;
}

interface CompanyTableProps {
  companies: Company[];
  isLoading: boolean;
  onEdit: (company: Company) => void;
  selectedRows: string[];
  onSelectionChange: (selectedIds: string[]) => void;
}

export function CompanyTable({ companies, isLoading, onEdit, selectedRows, onSelectionChange }: CompanyTableProps) {
  const allSelected = companies.length > 0 && selectedRows.length === companies.length;
  const someSelected = selectedRows.length > 0 && selectedRows.length < companies.length;

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(companies.map(c => c.id));
    }
  };

  const handleSelectRow = (companyId: string) => {
    if (selectedRows.includes(companyId)) {
      onSelectionChange(selectedRows.filter(id => id !== companyId));
    } else {
      onSelectionChange([...selectedRows, companyId]);
    }
  };
  const getPriorityColor = (tier: string | null) => {
    if (!tier) return "bg-muted";
    if (tier.includes("P1")) return "bg-priority-p1 text-priority-p1-foreground";
    if (tier.includes("P2")) return "bg-priority-p2 text-priority-p2-foreground";
    if (tier.includes("P3")) return "bg-priority-p3 text-priority-p3-foreground";
    return "bg-muted";
  };

  const getStatusColor = (status: string) => {
    const statusMap: Record<string, string> = {
      Lead: "bg-status-lead",
      Contacted: "bg-status-contacted",
      Engaged: "bg-status-engaged",
      Pilot: "bg-status-pilot",
      Active: "bg-status-active",
      Inactive: "bg-status-inactive",
      Lost: "bg-status-lost",
    };
    return statusMap[status] || "bg-muted";
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Loading companies...</p>
      </div>
    );
  }

  if (!companies || companies.length === 0) {
    return (
      <div className="text-center py-12 border border-border rounded-lg">
        <p className="text-muted-foreground">No companies found. Add your first company to get started!</p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={allSelected || someSelected}
                onCheckedChange={handleSelectAll}
              />
            </TableHead>
            <TableHead>Company Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Segment</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Score</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {companies.map((company) => (
            <TableRow key={company.id}>
              <TableCell>
                <Checkbox
                  checked={selectedRows.includes(company.id)}
                  onCheckedChange={() => handleSelectRow(company.id)}
                />
              </TableCell>
              <TableCell className="font-medium">{company.company_name}</TableCell>
              <TableCell>
                <Badge variant="outline">{company.industry_type}</Badge>
              </TableCell>
              <TableCell className="text-sm">
                {company.builder_segment || company.contractor_segment}
              </TableCell>
              <TableCell>
                <Badge className={getStatusColor(company.status)}>
                  {company.status}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${company.lead_score}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">{company.lead_score}</span>
                </div>
              </TableCell>
              <TableCell>
                {company.priority_tier && (
                  <Badge className={getPriorityColor(company.priority_tier)}>
                    {company.priority_tier.split(":")[0]}
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => onEdit(company)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  {company.website_url && (
                    <Button variant="ghost" size="sm" asChild>
                      <a href={company.website_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
