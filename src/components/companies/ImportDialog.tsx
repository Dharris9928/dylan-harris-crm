import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

export function ImportDialog({ open, onClose, onImportComplete }: ImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      const validTypes = [
        "text/csv",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ];
      
      if (validTypes.includes(selectedFile.type) || selectedFile.name.endsWith(".csv")) {
        setFile(selectedFile);
        setImportResult(null);
      } else {
        toast({
          title: "Invalid File Type",
          description: "Please select a CSV or Excel file",
          variant: "destructive",
        });
      }
    }
  };

  const parseFile = async (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      if (file.name.endsWith(".csv")) {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => resolve(results.data),
          error: (error) => reject(error),
        });
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: "array" });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet);
            resolve(jsonData);
          } catch (error) {
            reject(error);
          }
        };
        reader.readAsArrayBuffer(file);
      }
    });
  };

  const mapImportData = (row: any) => {
    return {
      company_name: row["Company Name"] || row["company_name"],
      industry_type: row["Industry Type"] || row["industry_type"] || "Builder",
      status: row["Status"] || row["status"] || "Lead",
      website_url: row["Website"] || row["website_url"] || null,
      primary_phone: row["Phone"] || row["primary_phone"] || null,
      linkedin_company_url: row["LinkedIn"] || row["linkedin_company_url"] || null,
      builder_segment: row["Builder Segment"] || row["builder_segment"] || null,
      contractor_segment: row["Contractor Segment"] || row["contractor_segment"] || null,
      lead_score: parseInt(row["Lead Score"] || row["lead_score"]) || 0,
      priority_tier: row["Priority Tier"] || row["priority_tier"] || null,
      is_franchise: row["Is Franchise"] === "Yes" || row["is_franchise"] === true || false,
      years_in_business: parseInt(row["Years in Business"] || row["years_in_business"]) || null,
      total_employees: parseInt(row["Total Employees"] || row["total_employees"]) || null,
      annual_revenue_range: row["Annual Revenue Range"] || row["annual_revenue_range"] || null,
    };
  };

  const handleImport = async () => {
    if (!file) return;

    setIsImporting(true);
    setProgress(0);

    try {
      const rawData = await parseFile(file);
      
      if (!rawData || rawData.length === 0) {
        throw new Error("No data found in file");
      }

      const result: ImportResult = {
        success: 0,
        failed: 0,
        errors: [],
      };

      const batchSize = 10;
      const totalBatches = Math.ceil(rawData.length / batchSize);

      for (let i = 0; i < rawData.length; i += batchSize) {
        const batch = rawData.slice(i, i + batchSize);
        const mappedBatch = batch.map(mapImportData);

        try {
          const { data, error } = await supabase
            .from("companies")
            .insert(mappedBatch)
            .select();

          if (error) {
            result.failed += batch.length;
            result.errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
          } else {
            result.success += data?.length || 0;
          }
        } catch (batchError: any) {
          result.failed += batch.length;
          result.errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${batchError.message}`);
        }

        setProgress(Math.round(((i + batchSize) / rawData.length) * 100));
      }

      setImportResult(result);

      if (result.success > 0) {
        toast({
          title: "Import Complete",
          description: `Successfully imported ${result.success} companies`,
        });
        onImportComplete();
      }

      if (result.failed > 0) {
        toast({
          title: "Import Issues",
          description: `${result.failed} companies failed to import`,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Import error:", error);
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import companies",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setImportResult(null);
    setProgress(0);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Companies</DialogTitle>
          <DialogDescription>
            Upload a CSV or Excel file with company data
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* File Upload */}
          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <Button
              variant="outline"
              className="w-full h-32 border-2 border-dashed"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
            >
              <div className="flex flex-col items-center gap-2">
                <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
                {file ? (
                  <>
                    <span className="font-medium">{file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      Click to change file
                    </span>
                  </>
                ) : (
                  <>
                    <span>Click to select file</span>
                    <span className="text-xs text-muted-foreground">
                      CSV or Excel (.xlsx, .xls)
                    </span>
                  </>
                )}
              </div>
            </Button>
          </div>

          {/* Progress Bar */}
          {isImporting && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-center text-muted-foreground">
                Importing... {progress}%
              </p>
            </div>
          )}

          {/* Import Results */}
          {importResult && (
            <div className="space-y-2">
              {importResult.success > 0 && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription>
                    Successfully imported {importResult.success} companies
                  </AlertDescription>
                </Alert>
              )}
              
              {importResult.failed > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {importResult.failed} companies failed to import
                    {importResult.errors.length > 0 && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs">
                          View errors
                        </summary>
                        <ul className="mt-2 text-xs space-y-1">
                          {importResult.errors.slice(0, 5).map((error, idx) => (
                            <li key={idx}>• {error}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Instructions */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Required columns:</strong> Company Name, Industry Type
              <br />
              <strong>Optional columns:</strong> Status, Website, Phone, Builder Segment, Contractor Segment, Lead Score, Priority Tier, etc.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isImporting}>
            {importResult ? "Close" : "Cancel"}
          </Button>
          {!importResult && (
            <Button onClick={handleImport} disabled={!file || isImporting}>
              <Upload className="h-4 w-4 mr-2" />
              {isImporting ? "Importing..." : "Import"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
