import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Plus, X, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface AdvancedFilter {
  id: string;
  field: string;
  operator: string;
  value: string;
  logic?: 'AND' | 'OR';
}

interface AdvancedSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplyFilters: (filters: AdvancedFilter[]) => void;
  initialFilters?: AdvancedFilter[];
}

const COMPANY_FIELDS = [
  { value: 'company_name', label: 'Company Name', type: 'text' },
  { value: 'industry_type', label: 'Industry Type', type: 'text' },
  { value: 'segment', label: 'Segment', type: 'text' },
  { value: 'status', label: 'Status', type: 'text' },
  { value: 'priority_tier', label: 'Priority Tier', type: 'text' },
  { value: 'lead_score', label: 'Lead Score', type: 'number' },
  { value: 'website_url', label: 'Website URL', type: 'text' },
  { value: 'primary_email', label: 'Primary Email', type: 'text' },
  { value: 'primary_phone', label: 'Primary Phone', type: 'text' },
  { value: 'city', label: 'City', type: 'text' },
  { value: 'state', label: 'State', type: 'text' },
  { value: 'zip', label: 'ZIP Code', type: 'text' },
  { value: 'region', label: 'Region', type: 'text' },
  { value: 'annual_revenue_range', label: 'Annual Revenue Range', type: 'text' },
  { value: 'annual_volume', label: 'Annual Volume', type: 'number' },
  { value: 'total_employees', label: 'Total Employees', type: 'number' },
  { value: 'total_employees_range', label: 'Total Employees Range', type: 'text' },
  { value: 'years_in_business', label: 'Years in Business', type: 'number' },
  { value: 'years_in_business_range', label: 'Years in Business Range', type: 'text' },
  { value: 'owner_name', label: 'Owner Name', type: 'text' },
  { value: 'contractor_specialty', label: 'Contractor Specialty', type: 'text' },
  { value: 'price_point_category', label: 'Price Point Category', type: 'text' },
  { value: 'service_area_type', label: 'Service Area Type', type: 'text' },
  { value: 'partner_relationship_status', label: 'Partner Relationship Status', type: 'text' },
  { value: 'linkedin_company_url', label: 'LinkedIn URL', type: 'text' },
  { value: 'linkedin_followers_range', label: 'LinkedIn Followers Range', type: 'text' },
  { value: 'linkedin_activity_level', label: 'LinkedIn Activity Level', type: 'text' },
  { value: 'website_quality', label: 'Website Quality', type: 'text' },
  { value: 'technology_adoption_level', label: 'Technology Adoption Level', type: 'text' },
  { value: 'online_review_rating', label: 'Online Review Rating', type: 'number' },
  { value: 'online_review_count_range', label: 'Online Review Count Range', type: 'text' },
  { value: 'buying_intent_strength', label: 'Buying Intent Strength', type: 'text' },
  { value: 'buying_intent_topics', label: 'Buying Intent Topics', type: 'array' },
  { value: 'currently_using_technologies', label: 'Currently Using Technologies', type: 'array' },
  { value: 'is_franchise', label: 'Is Franchise', type: 'boolean' },
  { value: 'is_parent_company', label: 'Is Parent Company', type: 'boolean' },
  { value: 'last_contact_date', label: 'Last Contact Date', type: 'date' },
  { value: 'next_activity_date', label: 'Next Activity Date', type: 'date' },
  { value: 'created_at', label: 'Created Date', type: 'date' },
  { value: 'updated_at', label: 'Updated Date', type: 'date' },
];

const TEXT_OPERATORS = [
  { value: 'eq', label: 'Equals' },
  { value: 'neq', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: 'Does Not Contain' },
  { value: 'starts_with', label: 'Starts With' },
  { value: 'ends_with', label: 'Ends With' },
  { value: 'is_empty', label: 'Is Empty' },
  { value: 'is_not_empty', label: 'Is Not Empty' },
];

const NUMBER_OPERATORS = [
  { value: 'eq', label: 'Equals' },
  { value: 'neq', label: 'Not Equals' },
  { value: 'gt', label: 'Greater Than' },
  { value: 'gte', label: 'Greater Than or Equal' },
  { value: 'lt', label: 'Less Than' },
  { value: 'lte', label: 'Less Than or Equal' },
  { value: 'is_empty', label: 'Is Empty' },
  { value: 'is_not_empty', label: 'Is Not Empty' },
];

const DATE_OPERATORS = [
  { value: 'eq', label: 'On Date' },
  { value: 'before', label: 'Before' },
  { value: 'after', label: 'After' },
  { value: 'between', label: 'Between' },
  { value: 'is_empty', label: 'Is Empty' },
  { value: 'is_not_empty', label: 'Is Not Empty' },
];

const BOOLEAN_OPERATORS = [
  { value: 'eq', label: 'Is' },
];

const ARRAY_OPERATORS = [
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: 'Does Not Contain' },
  { value: 'is_empty', label: 'Is Empty' },
  { value: 'is_not_empty', label: 'Is Not Empty' },
];

export function AdvancedSearchDialog({ open, onOpenChange, onApplyFilters, initialFilters = [] }: AdvancedSearchDialogProps) {
  const [filters, setFilters] = useState<AdvancedFilter[]>(
    initialFilters.length > 0 ? initialFilters : [{ id: crypto.randomUUID(), field: '', operator: '', value: '', logic: 'AND' }]
  );

  const addFilter = () => {
    setFilters([...filters, { id: crypto.randomUUID(), field: '', operator: '', value: '', logic: 'AND' }]);
  };

  const removeFilter = (id: string) => {
    setFilters(filters.filter(f => f.id !== id));
  };

  const updateFilter = (id: string, updates: Partial<AdvancedFilter>) => {
    setFilters(filters.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const getOperatorsForField = (fieldValue: string) => {
    const field = COMPANY_FIELDS.find(f => f.value === fieldValue);
    if (!field) return TEXT_OPERATORS;
    
    switch (field.type) {
      case 'number':
        return NUMBER_OPERATORS;
      case 'date':
        return DATE_OPERATORS;
      case 'boolean':
        return BOOLEAN_OPERATORS;
      case 'array':
        return ARRAY_OPERATORS;
      default:
        return TEXT_OPERATORS;
    }
  };

  const getFieldType = (fieldValue: string) => {
    return COMPANY_FIELDS.find(f => f.value === fieldValue)?.type || 'text';
  };

  const handleApply = () => {
    const validFilters = filters.filter(f => f.field && f.operator);
    onApplyFilters(validFilters);
    onOpenChange(false);
  };

  const handleClear = () => {
    setFilters([{ id: crypto.randomUUID(), field: '', operator: '', value: '', logic: 'AND' }]);
  };

  const needsValue = (operator: string) => {
    return !['is_empty', 'is_not_empty'].includes(operator);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Advanced Search & Filtering
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[500px] pr-4">
          <div className="space-y-4">
            {filters.map((filter, index) => (
              <div key={filter.id} className="space-y-3 border border-border rounded-lg p-4 bg-muted/30">
                {index > 0 && (
                  <div className="flex items-center gap-2 mb-2">
                    <Select 
                      value={filter.logic} 
                      onValueChange={(value: 'AND' | 'OR') => updateFilter(filter.id, { logic: value })}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AND">AND</SelectItem>
                        <SelectItem value="OR">OR</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex-1 border-t border-border" />
                  </div>
                )}

                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-4">
                    <Select 
                      value={filter.field} 
                      onValueChange={(value) => updateFilter(filter.id, { field: value, operator: '', value: '' })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select field..." />
                      </SelectTrigger>
                      <SelectContent>
                        {COMPANY_FIELDS.map(field => (
                          <SelectItem key={field.value} value={field.value}>
                            {field.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-3">
                    <Select 
                      value={filter.operator} 
                      onValueChange={(value) => updateFilter(filter.id, { operator: value })}
                      disabled={!filter.field}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Operator..." />
                      </SelectTrigger>
                      <SelectContent>
                        {getOperatorsForField(filter.field).map(op => (
                          <SelectItem key={op.value} value={op.value}>
                            {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-4">
                    {needsValue(filter.operator) && (
                      <>
                        {getFieldType(filter.field) === 'boolean' ? (
                          <Select 
                            value={filter.value} 
                            onValueChange={(value) => updateFilter(filter.id, { value })}
                            disabled={!filter.operator}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">Yes</SelectItem>
                              <SelectItem value="false">No</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            type={getFieldType(filter.field) === 'number' ? 'number' : 
                                  getFieldType(filter.field) === 'date' ? 'date' : 'text'}
                            placeholder="Value..."
                            value={filter.value}
                            onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                            disabled={!filter.operator}
                          />
                        )}
                      </>
                    )}
                  </div>

                  <div className="col-span-1 flex items-center justify-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFilter(filter.id)}
                      disabled={filters.length === 1}
                      className="h-8 w-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            <Button 
              variant="outline" 
              onClick={addFilter}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Filter Condition
            </Button>
          </div>
        </ScrollArea>

        <DialogFooter className="flex justify-between items-center">
          <Button variant="outline" onClick={handleClear}>
            Clear All
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleApply}>
              Apply Filters ({filters.filter(f => f.field && f.operator).length})
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
