import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronsUpDown, AlertTriangle, ArrowRight, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/useDebounce";

interface MergeCompaniesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface Company {
  id: string;
  company_name: string;
  industry_type: string;
  segment: string | null;
  status: string | null;
  lead_score: number;
}

interface MergePreview {
  contacts_count: number;
  activities_count: number;
  branches_count: number;
  installations_count: number;
  communications_count: number;
}

export function MergeCompaniesDialog({ open, onOpenChange, onSuccess }: MergeCompaniesDialogProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [sourceCompanyId, setSourceCompanyId] = useState<string>("");
  const [targetCompanyId, setTargetCompanyId] = useState<string>("");
  const [sourceSearch, setSourceSearch] = useState("");
  const [targetSearch, setTargetSearch] = useState("");
  const [openSourceCombobox, setOpenSourceCombobox] = useState(false);
  const [openTargetCombobox, setOpenTargetCombobox] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<MergePreview | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  const debouncedSourceSearch = useDebounce(sourceSearch, 300);
  const debouncedTargetSearch = useDebounce(targetSearch, 300);

  useEffect(() => {
    if (open) {
      loadCompanies();
    }
  }, [open, debouncedSourceSearch, debouncedTargetSearch]);

  useEffect(() => {
    if (sourceCompanyId && targetCompanyId) {
      loadMergePreview();
    } else {
      setPreview(null);
      setShowConfirmation(false);
    }
  }, [sourceCompanyId, targetCompanyId]);

  const loadCompanies = async () => {
    let query = supabase
      .from("companies")
      .select("id, company_name, industry_type, segment, status, lead_score")
      .order("company_name");
    
    const { data } = await query.limit(100);
    if (data) setCompanies(data);
  };

  const loadMergePreview = async () => {
    if (!sourceCompanyId) return;

    try {
      const [contacts, activities, branches, installations, communications] = await Promise.all([
        supabase.from("contacts").select("id", { count: "exact", head: true }).eq("company_id", sourceCompanyId),
        supabase.from("outreach_activities").select("id", { count: "exact", head: true }).eq("company_id", sourceCompanyId),
        supabase.from("company_branches").select("id", { count: "exact", head: true }).eq("company_id", sourceCompanyId),
        supabase.from("installation_history").select("id", { count: "exact", head: true }).eq("company_id", sourceCompanyId),
        supabase.from("company_communications").select("id", { count: "exact", head: true }).eq("company_id", sourceCompanyId),
      ]);

      setPreview({
        contacts_count: contacts.count || 0,
        activities_count: activities.count || 0,
        branches_count: branches.count || 0,
        installations_count: installations.count || 0,
        communications_count: communications.count || 0,
      });
    } catch (error) {
      console.error("Error loading preview:", error);
    }
  };

  const handleMerge = async () => {
    if (!sourceCompanyId || !targetCompanyId) {
      toast.error("Please select both source and target companies");
      return;
    }

    if (sourceCompanyId === targetCompanyId) {
      toast.error("Cannot merge a company with itself");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("merge-companies", {
        body: {
          source_company_id: sourceCompanyId,
          target_company_id: targetCompanyId,
        },
      });

      if (error) throw error;

      toast.success(`Successfully merged companies. ${data.message}`);
      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error("Merge error:", error);
      toast.error(error.message || "Failed to merge companies");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSourceCompanyId("");
    setTargetCompanyId("");
    setSourceSearch("");
    setTargetSearch("");
    setPreview(null);
    setShowConfirmation(false);
  };

  const sourceCompany = companies.find((c) => c.id === sourceCompanyId);
  const targetCompany = companies.find((c) => c.id === targetCompanyId);

  const filteredSourceCompanies = companies.filter((c) =>
    c.company_name.toLowerCase().includes(debouncedSourceSearch.toLowerCase()) &&
    c.id !== targetCompanyId
  );

  const filteredTargetCompanies = companies.filter((c) =>
    c.company_name.toLowerCase().includes(debouncedTargetSearch.toLowerCase()) &&
    c.id !== sourceCompanyId
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Merge Company Profiles</DialogTitle>
          <DialogDescription>
            Select two companies to merge. All data from the source company will be transferred to the target company.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> This action cannot be undone. The source company profile will be deleted after merging.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Source Company (will be deleted)</label>
              <Popover open={openSourceCombobox} onOpenChange={setOpenSourceCombobox}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className={cn(
                      "w-full justify-between",
                      !sourceCompanyId && "text-muted-foreground"
                    )}
                  >
                    {sourceCompanyId
                      ? sourceCompany?.company_name
                      : "Select source company..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Search companies..."
                      value={sourceSearch}
                      onValueChange={setSourceSearch}
                    />
                    <CommandList>
                      <CommandEmpty>No company found.</CommandEmpty>
                      <CommandGroup>
                        {filteredSourceCompanies.map((company) => (
                          <CommandItem
                            key={company.id}
                            value={company.company_name}
                            onSelect={() => {
                              setSourceCompanyId(company.id);
                              setSourceSearch(company.company_name);
                              setOpenSourceCombobox(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                company.id === sourceCompanyId
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span>{company.company_name}</span>
                              <span className="text-xs text-muted-foreground">
                                {company.industry_type} • Score: {company.lead_score}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex justify-center">
              <ArrowRight className="h-6 w-6 text-muted-foreground" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Target Company (will be kept)</label>
              <Popover open={openTargetCombobox} onOpenChange={setOpenTargetCombobox}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className={cn(
                      "w-full justify-between",
                      !targetCompanyId && "text-muted-foreground"
                    )}
                  >
                    {targetCompanyId
                      ? targetCompany?.company_name
                      : "Select target company..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Search companies..."
                      value={targetSearch}
                      onValueChange={setTargetSearch}
                    />
                    <CommandList>
                      <CommandEmpty>No company found.</CommandEmpty>
                      <CommandGroup>
                        {filteredTargetCompanies.map((company) => (
                          <CommandItem
                            key={company.id}
                            value={company.company_name}
                            onSelect={() => {
                              setTargetCompanyId(company.id);
                              setTargetSearch(company.company_name);
                              setOpenTargetCombobox(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                company.id === targetCompanyId
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span>{company.company_name}</span>
                              <span className="text-xs text-muted-foreground">
                                {company.industry_type} • Score: {company.lead_score}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {preview && sourceCompany && targetCompany && (
            <div className="space-y-4">
              <div className="border rounded-lg p-4 space-y-3 bg-muted/50">
                <h3 className="font-semibold flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Merge Preview
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Contacts</p>
                    <p className="font-medium">{preview.contacts_count}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Activities</p>
                    <p className="font-medium">{preview.activities_count}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Branches</p>
                    <p className="font-medium">{preview.branches_count}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Installations</p>
                    <p className="font-medium">{preview.installations_count}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Communications</p>
                    <p className="font-medium">{preview.communications_count}</p>
                  </div>
                </div>
              </div>

              {!showConfirmation && (
                <Button
                  onClick={() => setShowConfirmation(true)}
                  variant="outline"
                  className="w-full"
                >
                  Review and Confirm Merge
                </Button>
              )}

              {showConfirmation && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-semibold mb-2">Please confirm:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>All data from <strong>{sourceCompany.company_name}</strong> will be moved to <strong>{targetCompany.company_name}</strong></li>
                      <li>The source company profile will be permanently deleted</li>
                      <li>This action cannot be undone</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleMerge}
            disabled={loading || !showConfirmation || !sourceCompanyId || !targetCompanyId}
          >
            {loading ? "Merging..." : "Confirm Merge"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
