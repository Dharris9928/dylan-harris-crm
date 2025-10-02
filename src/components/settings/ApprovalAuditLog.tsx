import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Shield, CheckCircle, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";

interface AuditLogEntry {
  id: string;
  user_id: string;
  previous_status: string | null;
  new_status: string;
  approved_by: string | null;
  created_at: string;
  user_name?: string;
  approver_name?: string;
}

export function ApprovalAuditLog() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchAuditLogs();

      // Real-time subscription
      const channel = supabase
        .channel('approval_audit_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'approval_audit_log'
          },
          () => {
            fetchAuditLogs();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isAdmin]);

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    setIsAdmin(roleData?.role === 'admin');
  };

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const { data: logsData, error } = await supabase
        .from('approval_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Get user and approver names
      const userIds = [...new Set([
        ...(logsData?.map(l => l.user_id) || []),
        ...(logsData?.map(l => l.approved_by).filter(Boolean) as string[] || [])
      ])];

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', userIds);

      const profilesMap = (profilesData || []).reduce((acc, profile) => {
        acc[profile.id] = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown';
        return acc;
      }, {} as Record<string, string>);

      const logsWithNames = (logsData || []).map(log => ({
        ...log,
        user_name: profilesMap[log.user_id],
        approver_name: log.approved_by ? profilesMap[log.approved_by] : 'System'
      }));

      setLogs(logsWithNames);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any; color: string }> = {
      pending: { variant: 'outline', icon: Clock, color: 'text-yellow-600' },
      approved: { variant: 'default', icon: CheckCircle, color: 'text-green-600' },
      rejected: { variant: 'destructive', icon: XCircle, color: 'text-red-600' }
    };
    const config = variants[status] || variants.pending;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (!isAdmin) {
    return null; // Don't show for non-admins
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">Loading audit logs...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          User Approval Audit Trail
        </CardTitle>
        <CardDescription>
          Security log of all user approval status changes (last 50 entries)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No audit logs yet</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date/Time</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Previous Status</TableHead>
                  <TableHead>New Status</TableHead>
                  <TableHead>Approved By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">
                      {format(new Date(log.created_at), 'PPp')}
                    </TableCell>
                    <TableCell className="font-medium">{log.user_name}</TableCell>
                    <TableCell>
                      {log.previous_status ? getStatusBadge(log.previous_status) : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>{getStatusBadge(log.new_status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.approver_name}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
