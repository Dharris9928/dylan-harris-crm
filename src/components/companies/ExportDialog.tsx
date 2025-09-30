import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Download } from "lucide-react";

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  selectedIds?: string[] | null;
  filters: any;
  totalCount: number;
}

export function ExportDialog({ open, onClose, selectedIds, filters, totalCount }: ExportDialogProps) {
  const [exportFormat, setExportFormat] = useState<"csv" | "excel">("csv");
  const [exportScope, setExportScope] = useState<"all" | "filtered" | "selected">(
    selectedIds && selectedIds.length > 0 ? "selected" : "all"
  );
  const [includeColumns, setIncludeColumns] = useState({
    basic: true,
    contact: true,
    segment: true,
    metrics: true,
  });
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    setIsExporting(true);
    try {
      let query = supabase.from("companies").select("*");

      // Apply scope
      if (exportScope === "selected" && selectedIds && selectedIds.length > 0) {
        query = query.in("id", selectedIds);
      } else if (exportScope === "filtered") {
        // Apply filters
        if (filters.status) query = query.eq("status", filters.status);
        if (filters.priority) query = query.eq("priority_tier", filters.priority);
        if (filters.builder_segment) query = query.eq("builder_segment", filters.builder_segment);
        if (filters.contractor_segment) query = query.eq("contractor_segment", filters.contractor_segment);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (!data || data.length === 0) {
        toast({
          title: "No Data",
          description: "No companies to export",
          variant: "destructive",
        });
        return;
      }

      // Filter columns based on selection
      const exportData = data.map(company => {
        const row: any = {};
        
        if (includeColumns.basic) {
          row["Company Name"] = company.company_name;
          row["Industry Type"] = company.industry_type;
          row["Status"] = company.status;
          row["Is Franchise"] = company.is_franchise ? "Yes" : "No";
        }
        
        if (includeColumns.contact) {
          row["Website"] = company.website_url || "";
          row["Phone"] = company.primary_phone || "";
          row["LinkedIn"] = company.linkedin_company_url || "";
        }
        
        if (includeColumns.segment) {
          row["Builder Segment"] = company.builder_segment || "";
          row["Contractor Segment"] = company.contractor_segment || "";
          row["Segment Confidence"] = company.segment_confidence || "";
        }
        
        if (includeColumns.metrics) {
          row["Lead Score"] = company.lead_score || 0;
          row["Priority Tier"] = company.priority_tier || "";
          row["Years in Business"] = company.years_in_business || "";
          row["Total Employees"] = company.total_employees || "";
          row["Annual Revenue Range"] = company.annual_revenue_range || "";
        }
        
        return row;
      });

      // Generate file
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `companies_export_${timestamp}`;

      if (exportFormat === "csv") {
        const csv = Papa.unparse(exportData);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${filename}.csv`;
        link.click();
      } else {
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Companies");
        XLSX.writeFile(wb, `${filename}.xlsx`);
      }

      toast({
        title: "Export Successful",
        description: `Exported ${exportData.length} companies`,
      });

      onClose();
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export companies",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const getExportCount = () => {
    if (exportScope === "selected" && selectedIds) return selectedIds.length;
    if (exportScope === "filtered") return totalCount;
    return totalCount;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Export Companies</DialogTitle>
          <DialogDescription>
            Choose export format and options
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Export Format */}
          <div className="space-y-3">
            <Label>Export Format</Label>
            <RadioGroup value={exportFormat} onValueChange={(value: any) => setExportFormat(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="csv" />
                <Label htmlFor="csv" className="font-normal cursor-pointer">
                  CSV (Comma Separated Values)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="excel" id="excel" />
                <Label htmlFor="excel" className="font-normal cursor-pointer">
                  Excel (.xlsx)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Export Scope */}
          <div className="space-y-3">
            <Label>Export Scope</Label>
            <RadioGroup value={exportScope} onValueChange={(value: any) => setExportScope(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all" className="font-normal cursor-pointer">
                  All companies ({totalCount})
                </Label>
              </div>
              {selectedIds && selectedIds.length > 0 && (
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="selected" id="selected" />
                  <Label htmlFor="selected" className="font-normal cursor-pointer">
                    Selected companies ({selectedIds.length})
                  </Label>
                </div>
              )}
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="filtered" id="filtered" />
                <Label htmlFor="filtered" className="font-normal cursor-pointer">
                  Current filtered view
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Column Selection */}
          <div className="space-y-3">
            <Label>Include Columns</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="basic"
                  checked={includeColumns.basic}
                  onCheckedChange={(checked) =>
                    setIncludeColumns({ ...includeColumns, basic: !!checked })
                  }
                />
                <Label htmlFor="basic" className="font-normal cursor-pointer">
                  Basic Info (Name, Type, Status)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="contact"
                  checked={includeColumns.contact}
                  onCheckedChange={(checked) =>
                    setIncludeColumns({ ...includeColumns, contact: !!checked })
                  }
                />
                <Label htmlFor="contact" className="font-normal cursor-pointer">
                  Contact Info (Website, Phone, LinkedIn)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="segment"
                  checked={includeColumns.segment}
                  onCheckedChange={(checked) =>
                    setIncludeColumns({ ...includeColumns, segment: !!checked })
                  }
                />
                <Label htmlFor="segment" className="font-normal cursor-pointer">
                  Segmentation Data
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="metrics"
                  checked={includeColumns.metrics}
                  onCheckedChange={(checked) =>
                    setIncludeColumns({ ...includeColumns, metrics: !!checked })
                  }
                />
                <Label htmlFor="metrics" className="font-normal cursor-pointer">
                  Metrics (Score, Priority, Revenue)
                </Label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? "Exporting..." : `Export ${getExportCount()} Companies`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
