import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, Search, Download, Upload } from "lucide-react";
import { CompanyTable } from "@/components/companies/CompanyTable";
import { AddCompanyDialog } from "@/components/companies/AddCompanyDialog";
import { EditCompanyDialog } from "@/components/companies/EditCompanyDialog";
import { CompaniesFilterSidebar } from "@/components/companies/CompaniesFilterSidebar";
import { BulkActionBar } from "@/components/companies/BulkActionBar";
import { TablePagination } from "@/components/companies/TablePagination";
import { ExportDialog } from "@/components/companies/ExportDialog";
import { ImportDialog } from "@/components/companies/ImportDialog";
import { ColumnCustomization, type ColumnVisibility } from "@/components/companies/ColumnCustomization";
import { SavedFilters } from "@/components/companies/SavedFilters";
import { useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDebounce } from "@/hooks/useDebounce";

const Companies = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState(() => {
    return searchParams.get("search") || "";
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [sortBy, setSortBy] = useState(() => {
    return localStorage.getItem("companies-sort") || "lead_score_desc";
  });
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>(() => {
    const saved = localStorage.getItem("companies-column-visibility");
    return saved ? JSON.parse(saved) : {
      companyName: true,
      type: true,
      segment: true,
      status: true,
      score: true,
      priority: true,
      annualVolume: false,
      revenue: false,
      phone: false,
      website: false,
      franchise: false,
    };
  });

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Persist column visibility
  useEffect(() => {
    localStorage.setItem("companies-column-visibility", JSON.stringify(columnVisibility));
  }, [columnVisibility]);

  const statusFilter = searchParams.get("status");
  const priorityFilter = searchParams.get("priority");
  const builderSegmentFilter = searchParams.get("builder_segment");
  const contractorSegmentFilter = searchParams.get("contractor_segment");
  const industryTypeFilter = searchParams.get("industry_type");
  const stateFilter = searchParams.get("state");
  const cityFilter = searchParams.get("city");
  const hasWebsiteFilter = searchParams.get("has_website");
  const hasLinkedinFilter = searchParams.get("has_linkedin");
  const hasPartnerFilter = searchParams.get("has_partner");
  const lastContactFilter = searchParams.get("last_contact");

  // Persist sort selection
  useEffect(() => {
    localStorage.setItem("companies-sort", sortBy);
  }, [sortBy]);

  // Real-time subscription for companies
  useEffect(() => {
    const channel = supabase
      .channel('companies-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'companies' },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Persist search in URL
  useEffect(() => {
    const newParams = new URLSearchParams(searchParams);
    if (debouncedSearch) {
      newParams.set("search", debouncedSearch);
    } else {
      newParams.delete("search");
    }
    setSearchParams(newParams, { replace: true });
  }, [debouncedSearch]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedRows([]);
  }, [debouncedSearch, statusFilter, priorityFilter, builderSegmentFilter, contractorSegmentFilter, industryTypeFilter, stateFilter, cityFilter]);

  const { data: companies, isLoading, refetch } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filteredAndSortedCompanies = useMemo(() => {
    if (!companies) return [];
    
    let filtered = [...companies];
    
    // Apply search filter (minimum 2 characters)
    if (debouncedSearch && debouncedSearch.length >= 2) {
      const search = debouncedSearch.toLowerCase();
      filtered = filtered.filter(company => 
        company.company_name?.toLowerCase().includes(search) ||
        company.website_url?.toLowerCase().includes(search) ||
        company.city?.toLowerCase().includes(search) ||
        company.primary_phone?.toLowerCase().includes(search) ||
        company.nest_pro_partner_id?.toLowerCase().includes(search) ||
        company.linkedin_company_url?.toLowerCase().includes(search)
      );
    }
    
    // Apply industry type filter
    if (industryTypeFilter) {
      filtered = filtered.filter(company => company.industry_type === industryTypeFilter);
    }
    
    // Apply status filter
    if (statusFilter) {
      filtered = filtered.filter(company => company.status === statusFilter);
    }
    
    // Apply priority filter
    if (priorityFilter) {
      filtered = filtered.filter(company => company.priority_tier === priorityFilter);
    }

    // Apply builder segment filter
    if (builderSegmentFilter) {
      filtered = filtered.filter(company => company.builder_segment === builderSegmentFilter);
    }

    // Apply contractor segment filter
    if (contractorSegmentFilter) {
      filtered = filtered.filter(company => company.contractor_segment === contractorSegmentFilter);
    }
    
    // Note: State and city filters require company_branches data
    // These can be implemented when branches data is joined in the query
    
    // Apply data completeness filters
    if (hasWebsiteFilter === "true") {
      filtered = filtered.filter(company => company.website_url);
    }
    
    if (hasLinkedinFilter === "true") {
      filtered = filtered.filter(company => company.linkedin_company_url);
    }
    
    if (hasPartnerFilter === "true") {
      filtered = filtered.filter(company => company.nest_pro_partner_id);
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "lead_score_desc":
          return (b.lead_score || 0) - (a.lead_score || 0);
        case "lead_score_asc":
          return (a.lead_score || 0) - (b.lead_score || 0);
        case "name_asc":
          return a.company_name.localeCompare(b.company_name);
        case "name_desc":
          return b.company_name.localeCompare(a.company_name);
        case "created_desc":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "created_asc":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [companies, debouncedSearch, statusFilter, priorityFilter, builderSegmentFilter, contractorSegmentFilter, industryTypeFilter, hasWebsiteFilter, hasLinkedinFilter, hasPartnerFilter, sortBy]);

  // Paginated companies
  const paginatedCompanies = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAndSortedCompanies.slice(startIndex, endIndex);
  }, [filteredAndSortedCompanies, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredAndSortedCompanies.length / itemsPerPage);

  const clearFilters = () => {
    const newParams = new URLSearchParams();
    if (debouncedSearch) {
      newParams.set("search", debouncedSearch);
    }
    setSearchParams(newParams);
  };

  const applyFilters = (filters: any) => {
    const newParams = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        newParams.set(key, filters[key]);
      }
    });
    setSearchParams(newParams);
  };

  const currentFilters = {
    status: statusFilter,
    priority: priorityFilter,
    builder_segment: builderSegmentFilter,
    contractor_segment: contractorSegmentFilter,
    industry_type: industryTypeFilter,
    state: stateFilter,
    city: cityFilter,
  };

  const activeFilters = [
    industryTypeFilter && { type: "Industry", value: industryTypeFilter, key: "industry_type" },
    statusFilter && { type: "Status", value: statusFilter, key: "status" },
    priorityFilter && { type: "Priority", value: priorityFilter.split(":")[0], key: "priority" },
    builderSegmentFilter && { type: "Builder", value: builderSegmentFilter, key: "builder_segment" },
    contractorSegmentFilter && { type: "Contractor", value: contractorSegmentFilter, key: "contractor_segment" },
    stateFilter && { type: "State", value: stateFilter, key: "state" },
    cityFilter && { type: "City", value: cityFilter, key: "city" },
    hasWebsiteFilter === "true" && { type: "Filter", value: "Has Website", key: "has_website" },
    hasLinkedinFilter === "true" && { type: "Filter", value: "Has LinkedIn", key: "has_linkedin" },
    hasPartnerFilter === "true" && { type: "Filter", value: "Has Partner", key: "has_partner" },
    lastContactFilter && { type: "Last Contact", value: lastContactFilter, key: "last_contact" },
  ].filter(Boolean);

  const removeFilter = (key: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete(key);
    setSearchParams(newParams);
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Top Bar */}
      <div className="border-b border-border bg-card px-6 py-4 space-y-4">
        <div className="flex items-center justify-between gap-4">
          {/* Search */}
          <div className="relative w-[400px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search companies, websites, cities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            {searchQuery.length > 0 && searchQuery.length < 2 && (
              <p className="absolute left-0 top-full mt-1 text-xs text-muted-foreground">
                Type at least 2 characters to search
              </p>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Sort by:</span>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lead_score_desc">Lead Score (High to Low)</SelectItem>
                <SelectItem value="lead_score_asc">Lead Score (Low to High)</SelectItem>
                <SelectItem value="name_asc">Company Name (A-Z)</SelectItem>
                <SelectItem value="name_desc">Company Name (Z-A)</SelectItem>
                <SelectItem value="created_desc">Created Date (Newest)</SelectItem>
                <SelectItem value="created_asc">Created Date (Oldest)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <SavedFilters
              currentFilters={currentFilters}
              onApplyFilter={applyFilters}
            />

            <ColumnCustomization
              visibility={columnVisibility}
              onChange={setColumnVisibility}
            />

            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsExportDialogOpen(true)}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>

            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsImportDialogOpen(true)}
            >
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>

            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Company
            </Button>
          </div>
        </div>

        {/* Active Filters */}
        {activeFilters.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">Active filters:</span>
            {activeFilters.map((filter: any) => (
              <Badge 
                key={filter.key} 
                variant="secondary" 
                className="gap-1 cursor-pointer hover:bg-muted"
              >
                {filter.type}: {filter.value}
                <X 
                  className="h-3 w-3 hover:text-destructive" 
                  onClick={() => removeFilter(filter.key)}
                />
              </Badge>
            ))}
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7">
              Clear all
            </Button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Collapsible Sidebar */}
        <CompaniesFilterSidebar
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        {/* Table Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Result Count */}
          <div className="px-6 py-3 border-b border-border bg-muted/30">
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-medium text-foreground">{paginatedCompanies.length}</span> of{" "}
              <span className="font-medium text-foreground">{filteredAndSortedCompanies.length}</span> companies
              {debouncedSearch && debouncedSearch.length >= 2 && (
                <span className="ml-2">
                  matching "<span className="font-medium text-foreground">{debouncedSearch}</span>"
                </span>
              )}
            </p>
          </div>

          {/* Bulk Action Bar */}
          {selectedRows.length > 0 && (
            <BulkActionBar
              selectedCount={selectedRows.length}
              selectedIds={selectedRows}
              onClearSelection={() => setSelectedRows([])}
              onActionComplete={() => {
                refetch();
                setSelectedRows([]);
              }}
            />
          )}

          {/* Table */}
          <div className="flex-1 overflow-auto p-6">
            <CompanyTable
              companies={paginatedCompanies}
              isLoading={isLoading}
              onEdit={(company) => {
                setSelectedCompany(company);
                setIsEditDialogOpen(true);
              }}
              selectedRows={selectedRows}
              onSelectionChange={setSelectedRows}
              onCompanyUpdate={refetch}
              columnVisibility={columnVisibility}
            />
          </div>

          {/* Pagination */}
          {filteredAndSortedCompanies.length > 0 && (
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredAndSortedCompanies.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(value) => {
                setItemsPerPage(value);
                setCurrentPage(1);
              }}
            />
          )}
        </div>
      </div>

      <AddCompanyDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSuccess={() => {
          refetch();
          setIsAddDialogOpen(false);
        }}
      />

      {selectedCompany && (
        <EditCompanyDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSuccess={() => {
            refetch();
            setIsEditDialogOpen(false);
          }}
          companyId={selectedCompany.id}
        />
      )}

      <ExportDialog
        open={isExportDialogOpen}
        onClose={() => setIsExportDialogOpen(false)}
        selectedIds={selectedRows.length > 0 ? selectedRows : null}
        filters={{
          status: statusFilter,
          priority: priorityFilter,
          builder_segment: builderSegmentFilter,
          contractor_segment: contractorSegmentFilter,
        }}
        totalCount={filteredAndSortedCompanies.length}
      />

      <ImportDialog
        open={isImportDialogOpen}
        onClose={() => setIsImportDialogOpen(false)}
        onImportComplete={() => {
          refetch();
          setIsImportDialogOpen(false);
        }}
      />
    </div>
  );
};

export default Companies;
