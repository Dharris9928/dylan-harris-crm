import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Search, Eye, FileDown, Users } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from 'xlsx';

export function ContactAccessLogsViewer() {
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [dateRange, setDateRange] = useState("7");

  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ['contact-access-logs', actionFilter, dateRange],
    queryFn: async () => {
      let query = supabase
        .from('contact_access_logs')
        .select(`
          *,
          contacts(first_name, last_name, email),
          companies(company_name)
        `)
        .order('accessed_at', { ascending: false })
        .limit(500);

      if (actionFilter !== 'all') {
        query = query.eq('action', actionFilter);
      }

      if (dateRange !== 'all') {
        const days = parseInt(dateRange);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        query = query.gte('accessed_at', startDate.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    }
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('contact-access-logs-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'contact_access_logs'
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
    const contactName = `${log.contacts?.first_name || ''} ${log.contacts?.last_name || ''}`.toLowerCase();
    const companyName = log.companies?.company_name?.toLowerCase() || '';
    return contactName.includes(searchTerm.toLowerCase()) || 
           companyName.includes(searchTerm.toLowerCase());
  });

  const handleExport = () => {
    if (!filteredLogs || filteredLogs.length === 0) {
      toast.error('No data to export');
      return;
    }

    const exportData = filteredLogs.map(log => ({
      'Date/Time': new Date(log.accessed_at).toLocaleString(),
      'Action': log.action,
      'Contact': `${log.contacts?.first_name || ''} ${log.contacts?.last_name || ''}`,
      'Email': log.contacts?.email || '',
      'Company': log.companies?.company_name || '',
      'IP Address': log.ip_address || 'N/A'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Contact Access Logs');
    XLSX.writeFile(wb, `contact-access-logs-${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Logs exported successfully');
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'VIEW':
        return <Badge variant="secondary"><Eye className="h-3 w-3 mr-1" />View</Badge>;
      case 'EXPORT':
        return <Badge variant="destructive"><FileDown className="h-3 w-3 mr-1" />Export</Badge>;
      case 'BULK_VIEW':
        return <Badge variant="default"><Users className="h-3 w-3 mr-1" />Bulk View</Badge>;
      default:
        return <Badge>{action}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contact Access Logs</CardTitle>
        <CardDescription>
          Complete audit trail of all contact data access events
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by contact or company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="VIEW">View</SelectItem>
              <SelectItem value="EXPORT">Export</SelectItem>
              <SelectItem value="BULK_VIEW">Bulk View</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last 24 hours</SelectItem>
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
          Showing {filteredLogs?.length || 0} of {logs?.length || 0} access events
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-auto max-h-[600px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date/Time</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>IP Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    Loading access logs...
                  </TableCell>
                </TableRow>
              ) : filteredLogs && filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">
                      {new Date(log.accessed_at).toLocaleString()}
                    </TableCell>
                    <TableCell>{getActionBadge(log.action)}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {log.contacts?.first_name} {log.contacts?.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {log.contacts?.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{log.companies?.company_name || 'N/A'}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {log.ip_address || 'N/A'}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No access logs found
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
