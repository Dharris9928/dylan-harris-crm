import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Search, UserCheck, UserX, UserMinus } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from 'xlsx';

export function ApprovalAuditViewer() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "approved" | "pending" | "rejected">("all");
  const [dateRange, setDateRange] = useState("30");

  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ['approval-audit-logs', statusFilter, dateRange],
    queryFn: async () => {
      let query = supabase
        .from('approval_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (statusFilter !== 'all') {
        query = query.eq('new_status', statusFilter);
      }

      if (dateRange !== 'all') {
        const days = parseInt(dateRange);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        query = query.gte('created_at', startDate.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('approval-audit-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'approval_audit_log'
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  const filteredLogs = logs?.filter(log => {
    if (!searchTerm) return true;
    const userId = log.user_id?.toLowerCase() || '';
    const notes = log.notes?.toLowerCase() || '';
    return userId.includes(searchTerm.toLowerCase()) || 
           notes.includes(searchTerm.toLowerCase());
  });

  const handleExport = () => {
    if (!filteredLogs || filteredLogs.length === 0) {
      toast.error('No data to export');
      return;
    }

    const exportData = filteredLogs.map(log => ({
      'Date/Time': new Date(log.created_at).toLocaleString(),
      'User ID': log.user_id?.substring(0, 8),
      'Previous Status': log.previous_status || 'N/A',
      'New Status': log.new_status,
      'Approved By': log.approved_by?.substring(0, 8) || 'System',
      'Notes': log.notes || '',
      'IP Address': log.ip_address || 'N/A'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Approval Audit Log');
    XLSX.writeFile(wb, `approval-audit-${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Audit log exported successfully');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default"><UserCheck className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><UserX className="h-3 w-3 mr-1" />Rejected</Badge>;
      case 'pending':
        return <Badge variant="secondary"><UserMinus className="h-3 w-3 mr-1" />Pending</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Approval Audit Trail</CardTitle>
        <CardDescription>
          Complete history of user approval status changes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by user ID or notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleExport} variant="outline" className="w-full md:w-auto">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>

        {/* Results summary */}
        <div className="text-sm text-muted-foreground">
          Showing {filteredLogs?.length || 0} of {logs?.length || 0} approval events
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-auto max-h-[600px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date/Time</TableHead>
                <TableHead>User ID</TableHead>
                <TableHead>Status Change</TableHead>
                <TableHead>Approved By</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    Loading audit trail...
                  </TableCell>
                </TableRow>
              ) : filteredLogs && filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {log.user_id?.substring(0, 8)}...
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {log.previous_status && (
                          <Badge variant="outline" className="text-xs">
                            {log.previous_status}
                          </Badge>
                        )}
                        <span className="text-muted-foreground">→</span>
                        {getStatusBadge(log.new_status)}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {log.approved_by ? 
                        `${log.approved_by.substring(0, 8)}...` : 
                        'System'}
                    </TableCell>
                    <TableCell className="max-w-md truncate">
                      {log.notes || '-'}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No approval events found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
