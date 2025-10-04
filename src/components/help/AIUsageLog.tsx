import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Sparkles, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export function AIUsageLog() {
  const [featureFilter, setFeatureFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: logs, isLoading } = useQuery({
    queryKey: ['ai-usage-logs', featureFilter, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('ai_usage_logs')
        .select(`
          *,
          companies(company_name),
          contacts(first_name, last_name)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (featureFilter !== 'all') {
        query = query.eq('feature_type', featureFilter);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const getFeatureLabel = (type: string) => {
    const labels: Record<string, string> = {
      communication_generation: 'Communication Generation',
      contact_scoring: 'Contact Scoring',
      lead_prioritization: 'Lead Prioritization',
      outreach_strategy: 'Outreach Strategy',
      company_enrichment: 'Company Enrichment',
    };
    return labels[type] || type;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'rate_limited':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const clearFilters = () => {
    setFeatureFilter('all');
    setStatusFilter('all');
  };

  const hasActiveFilters = featureFilter !== 'all' || statusFilter !== 'all';

  // Calculate totals
  const totalTokens = logs?.reduce((sum, log) => sum + (log.total_tokens || 0), 0) || 0;
  const successCount = logs?.filter(log => log.status === 'success').length || 0;
  const errorCount = logs?.filter(log => log.status === 'error').length || 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle>AI Usage Activity Log</CardTitle>
        </div>
        <CardDescription>
          Track all AI API usage across communication generation, scoring, and enrichment features
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
          <div>
            <p className="text-xs text-muted-foreground">Total Requests</p>
            <p className="text-2xl font-bold">{logs?.length || 0}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Successful</p>
            <p className="text-2xl font-bold text-green-500">{successCount}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Errors</p>
            <p className="text-2xl font-bold text-red-500">{errorCount}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Tokens</p>
            <p className="text-2xl font-bold">{totalTokens.toLocaleString()}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <Label>Feature Type</Label>
            <Select value={featureFilter} onValueChange={setFeatureFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Features</SelectItem>
                <SelectItem value="communication_generation">Communication Generation</SelectItem>
                <SelectItem value="contact_scoring">Contact Scoring</SelectItem>
                <SelectItem value="lead_prioritization">Lead Prioritization</SelectItem>
                <SelectItem value="outreach_strategy">Outreach Strategy</SelectItem>
                <SelectItem value="company_enrichment">Company Enrichment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            <Label>Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="rate_limited">Rate Limited</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {hasActiveFilters && (
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          )}
        </div>

        {/* Activity Log */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Loading AI usage logs...</p>
          ) : logs && logs.length > 0 ? (
            logs.map((log: any) => (
              <div key={log.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                <div className="mt-1">{getStatusIcon(log.status)}</div>
                
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">{getFeatureLabel(log.feature_type)}</Badge>
                    <Badge variant="secondary">{log.ai_model}</Badge>
                    {log.companies && (
                      <Badge variant="outline" className="text-xs">
                        {log.companies.company_name}
                      </Badge>
                    )}
                    {log.contacts && (
                      <Badge variant="outline" className="text-xs">
                        {log.contacts.first_name} {log.contacts.last_name}
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}
                    {log.total_tokens && (
                      <span className="ml-2">• {log.total_tokens.toLocaleString()} tokens</span>
                    )}
                  </p>

                  {log.error_message && (
                    <p className="text-xs text-destructive mt-1">
                      Error: {log.error_message}
                    </p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-muted-foreground py-8">
              {hasActiveFilters ? 'No AI usage logs match your filters' : 'No AI usage recorded yet'}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
