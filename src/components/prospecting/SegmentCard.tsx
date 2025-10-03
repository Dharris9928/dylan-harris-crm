import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Search, Plus, Building2, Users, DollarSign, MapPin, TrendingUp } from 'lucide-react';

interface SegmentConfig {
  name: string;
  displayName: string;
  description: string;
  icon: React.ReactNode;
  apolloFilters: {
    keywords: string[];
    employeeRange?: string;
    revenueRange?: string;
    states?: string[];
    countries?: string[];
  };
  color: string;
  industryType: 'Builder' | 'Contractor';
}

interface ProspectCompany {
  apolloId: string;
  companyName: string;
  websiteUrl: string | null;
  linkedinUrl: string | null;
  industry: string | null;
  keywords: string[];
  phone: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  employees: number | null;
  employeeRange: string | null;
  revenue: number | null;
  revenueRange: string | null;
  foundedYear: number | null;
  yearsRange: string | null;
  description: string | null;
  logoUrl: string | null;
  technologies: string[];
  socialMediaUrls: {
    facebook: string | null;
    twitter: string | null;
    linkedin: string | null;
  };
}

interface SegmentCardProps {
  segment: SegmentConfig;
}

export function SegmentCard({ segment }: SegmentCardProps) {
  const { toast } = useToast();
  const [searching, setSearching] = useState(false);
  const [companies, setCompanies] = useState<ProspectCompany[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const searchSegment = async () => {
    setSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('apollo-company-search', {
        body: {
          keywords: segment.apolloFilters.keywords,
          employeeRange: segment.apolloFilters.employeeRange,
          revenueRange: segment.apolloFilters.revenueRange,
          states: segment.apolloFilters.states,
          countries: segment.apolloFilters.countries,
          page: 1
        }
      });

      if (error) throw error;

      setCompanies(data.companies || []);
      setSelectedCompanies(new Set());
      setExpanded(true);
      
      toast({
        title: 'Search Complete',
        description: `Found ${data.companies?.length || 0} companies for ${segment.displayName}`,
      });
    } catch (error: any) {
      console.error('Segment search error:', error);
      toast({
        title: 'Search Failed',
        description: error.message || 'Failed to search companies',
        variant: 'destructive'
      });
    } finally {
      setSearching(false);
    }
  };

  const toggleSelection = (apolloId: string) => {
    const newSelected = new Set(selectedCompanies);
    if (newSelected.has(apolloId)) {
      newSelected.delete(apolloId);
    } else {
      newSelected.add(apolloId);
    }
    setSelectedCompanies(newSelected);
  };

  const importSelected = async () => {
    const selected = companies.filter(c => selectedCompanies.has(c.apolloId));
    if (selected.length === 0) return;

    setImporting(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      
      const records = selected.map(company => ({
        company_name: company.companyName,
        website_url: company.websiteUrl,
        linkedin_company_url: company.linkedinUrl,
        primary_phone: company.phone,
        city: company.city,
        state: company.state,
        total_employees: company.employees,
        total_employees_range: company.employeeRange,
        annual_revenue_range: company.revenueRange,
        years_in_business: company.foundedYear ? new Date().getFullYear() - company.foundedYear : null,
        years_in_business_range: company.yearsRange,
        industry_type: segment.industryType,
        segment: segment.name,
        status: 'Lead',
        notes: company.description,
        facebook_url: company.socialMediaUrls.facebook,
        created_by: user.user?.id
      }));

      const { error } = await supabase.from('companies').insert(records);

      if (error) throw error;

      toast({
        title: 'Companies Imported',
        description: `${selected.length} companies added to ${segment.displayName} segment`,
      });

      setCompanies(companies.filter(c => !selectedCompanies.has(c.apolloId)));
      setSelectedCompanies(new Set());
    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        title: 'Import Failed',
        description: error.message || 'Failed to import companies',
        variant: 'destructive'
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Card className={`border-l-4 ${segment.color}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {segment.icon}
            <div>
              <CardTitle className="text-xl">{segment.displayName}</CardTitle>
              <CardDescription className="mt-1">{segment.description}</CardDescription>
            </div>
          </div>
          <Button
            onClick={searchSegment}
            disabled={searching}
            size="sm"
          >
            <Search className={`h-4 w-4 mr-2 ${searching ? 'animate-pulse' : ''}`} />
            {searching ? 'Searching...' : 'Find Companies'}
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          {segment.apolloFilters.keywords.map((keyword) => (
            <Badge key={keyword} variant="secondary" className="text-xs">
              {keyword}
            </Badge>
          ))}
          {segment.apolloFilters.employeeRange && (
            <Badge variant="outline" className="text-xs">
              <Users className="h-3 w-3 mr-1" />
              {segment.apolloFilters.employeeRange.replace(',', '-')} employees
            </Badge>
          )}
          {segment.apolloFilters.revenueRange && (
            <Badge variant="outline" className="text-xs">
              <DollarSign className="h-3 w-3 mr-1" />
              {segment.apolloFilters.revenueRange}
            </Badge>
          )}
          {segment.apolloFilters.states && segment.apolloFilters.states.length > 0 && (
            <Badge variant="outline" className="text-xs">
              <MapPin className="h-3 w-3 mr-1" />
              {segment.apolloFilters.states.join(', ')}
            </Badge>
          )}
        </div>
      </CardHeader>

      {companies.length > 0 && expanded && (
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between pb-2 border-b">
            <span className="text-sm font-medium">{companies.length} prospects found</span>
            {selectedCompanies.size > 0 && (
              <Button onClick={importSelected} disabled={importing} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Import {selectedCompanies.size} Selected
              </Button>
            )}
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {companies.map((company) => (
              <div key={company.apolloId} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                <Checkbox
                  checked={selectedCompanies.has(company.apolloId)}
                  onCheckedChange={() => toggleSelection(company.apolloId)}
                />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium truncate">{company.companyName}</h4>
                  </div>
                  
                  {company.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{company.description}</p>
                  )}
                  
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {company.city && company.state && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {company.city}, {company.state}
                      </span>
                    )}
                    {company.employeeRange && (
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {company.employeeRange}
                      </span>
                    )}
                    {company.revenueRange && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {company.revenueRange}
                      </span>
                    )}
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    toggleSelection(company.apolloId);
                    setTimeout(() => {
                      if (selectedCompanies.has(company.apolloId)) {
                        importSelected();
                      }
                    }, 100);
                  }}
                >
                  <Building2 className="h-4 w-4 mr-1" />
                  Import
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
