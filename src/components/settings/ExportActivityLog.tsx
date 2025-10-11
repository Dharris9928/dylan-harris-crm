import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileDown, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useUserRole } from '@/hooks/useUserRole';

export function ExportActivityLog() {
  const { data: userRoleData } = useUserRole();
  const userRole = userRoleData?.role;
  const isAdmin = userRole === 'admin' || userRole === 'sales_manager';

  const { data: exportLogs, isLoading } = useQuery({
    queryKey: ['export-logs', isAdmin],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      let query = supabase
        .from('export_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      // Non-admins can only see their own logs
      if (!isAdmin) {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const { data: todayStats } = useQuery({
    queryKey: ['export-stats-today'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('export_logs')
        .select('record_count')
        .eq('user_id', user.id)
        .gte('created_at', new Date().toISOString().split('T')[0])
        .eq('status', 'completed');

      if (error) throw error;

      const total = data?.reduce((sum, log) => sum + log.record_count, 0) || 0;
      return { count: data?.length || 0, records: total };
    },
  });

  const { data: quota } = useQuery({
    queryKey: ['export-quota-info', userRole],
    queryFn: async () => {
      if (!userRole) return null;

      const { data, error } = await supabase
        .from('export_quotas')
        .select('*')
        .eq('role', userRole)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!userRole,
  });

  if (isLoading) {
    return <div>Loading export activity...</div>;
  }

  const remaining = quota ? quota.daily_limit - (todayStats?.records || 0) : 0;
  const percentUsed = quota ? ((todayStats?.records || 0) / quota.daily_limit) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Export Activity</CardTitle>
        <CardDescription>
          Track data exports and monitor your usage quota
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Today's Usage Stats */}
        {quota && (
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Today's Usage</span>
              <Badge variant={percentUsed > 80 ? 'destructive' : 'secondary'}>
                {todayStats?.records || 0} / {quota.daily_limit} records
              </Badge>
            </div>
            <div className="w-full bg-background rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  percentUsed > 80 ? 'bg-destructive' : 'bg-primary'
                }`}
                style={{ width: `${Math.min(percentUsed, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {remaining > 0 ? `${remaining} records remaining` : 'Quota exceeded'}
            </p>
          </div>
        )}

        {/* Export Log */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Recent Exports</h3>
          {exportLogs && exportLogs.length > 0 ? (
            <div className="space-y-2">
              {exportLogs.map((log: any) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 border rounded-lg text-sm"
                >
                  <div className="flex items-center gap-3">
                    <FileDown className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{log.table_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {log.record_count} records • {log.export_type} • 
                        {format(new Date(log.created_at), 'PPp')}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      log.status === 'completed'
                        ? 'secondary'
                        : log.status === 'failed'
                        ? 'destructive'
                        : 'outline'
                    }
                  >
                    {log.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileDown className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p>No export activity yet</p>
            </div>
          )}
        </div>

        {/* Warning for high usage */}
        {percentUsed > 80 && (
          <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-700">High Export Usage</p>
              <p className="text-amber-600">
                You're approaching your daily export limit. Consider requesting an approval for larger exports.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
