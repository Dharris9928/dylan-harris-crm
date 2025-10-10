import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Search, Upload, FileDown, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from 'xlsx';

export function ImportExportLogsViewer() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activityFilter, setActivityFilter] = useState("all");
  const [dateRange, setDateRange] = useState("30");

  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ['import-export-logs', activityFilter, dateRange],
    queryFn: async () => {
      let query = supabase
        .from('import_export_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (activityFilter !== 'all') {
        query = query.eq('activity_type', activityFilter);
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
      .channel('import-export-logs-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'import_export_logs'
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
    const tableName = log.table_name?.toLowerCase() || '';
    const fileFormat = log.file_format?.toLowerCase() || '';
    return tableName.includes(searchTerm.toLowerCase()) || 
           fileFormat.includes(searchTerm.toLowerCase());
  });

  const handleExport = () => {
    if (!filteredLogs || filteredLogs.length === 0) {
      toast.error('No data to export');
      return;
    }

    const exportData = filteredLogs.map(log => ({
      'Date/Time': new Date(log.created_at).toLocaleString(),
      'Activity': log.activity_type,
      'Table': log.table_name,
      'Format': log.file_format || 'N/A',
      'Records': log.record_count,
      'Successful': log.successful_count,
      'Failed': log.failed_count,
      'Duplicates': log.duplicate_count,
      'Has Errors': log.error_summary ? 'Yes' : 'No'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Import Export Logs');
    XLSX.writeFile(wb, `import-export-logs-${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Logs exported successfully');
  };

  const getActivityBadge = (activity: string) => {
    switch (activity) {
      case 'IMPORT':
        return <Badge variant="default"><Upload className="h-3 w-3 mr-1" />Import</Badge>;
      case 'EXPORT':
        return <Badge variant="secondary"><FileDown className="h-3 w-3 mr-1" />Export</Badge>;
      default:
        return <Badge>{activity}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import/Export Activity Logs</CardTitle>
        <CardDescription>
          Track all data import and export operations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by table or format..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={activityFilter} onValueChange={setActivityFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Filter by activity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Activities</SelectItem>
              <SelectItem value="IMPORT">Import</SelectItem>
              <SelectItem value="EXPORT">Export</SelectItem>
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
          Showing {filteredLogs?.length || 0} of {logs?.length || 0} operations
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-auto max-h-[600px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date/Time</TableHead>
                <TableHead>Activity</TableHead>
                <TableHead>Table</TableHead>
                <TableHead>Records</TableHead>
                <TableHead>Success/Failed</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Loading activity logs...
                  </TableCell>
                </TableRow>
              ) : filteredLogs && filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>{getActivityBadge(log.activity_type)}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{log.table_name}</p>
                        {log.file_format && (
                          <p className="text-xs text-muted-foreground">
                            {log.file_format.toUpperCase()}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{log.record_count} total</p>
                        {log.duplicate_count > 0 && (
                          <p className="text-muted-foreground">
                            {log.duplicate_count} duplicates
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p className="text-green-600">{log.successful_count} succeeded</p>
                        {log.failed_count > 0 && (
                          <p className="text-destructive">{log.failed_count} failed</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {log.error_summary ? (
                        <Badge variant="destructive" className="cursor-help" title={log.error_summary}>
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Errors
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Complete</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No import/export operations found
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
