import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Search, Upload, RotateCcw, FileText, AlertTriangle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { rollbackImport, getRollbackPreview } from "@/lib/import/rollbackImport";
import { format } from "date-fns";

interface ImportLog {
  id: string;
  created_at: string;
  batch_id: string | null;
  file_name: string | null;
  table_name: string;
  affected_tables: string[] | null;
  activity_type: string;
  file_format: string | null;
  record_count: number;
  successful_count: number;
  failed_count: number;
  duplicate_count: number;
  rollback_available: boolean | null;
  rolled_back_at: string | null;
  rolled_back_by: string | null;
  user_id: string;
  user_profile?: {
    first_name: string | null;
    last_name: string | null;
  };
}

export function UploadLogViewer() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activityFilter, setActivityFilter] = useState<string>("IMPORT");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [rollbackDialogOpen, setRollbackDialogOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<{ batchId: string; fileName: string } | null>(null);
  const [rollbackPreview, setRollbackPreview] = useState<Awaited<ReturnType<typeof getRollbackPreview>> | null>(null);
  const [isRollingBack, setIsRollingBack] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ['upload-logs', activityFilter, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('import_export_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (activityFilter !== "all") {
        query = query.eq('activity_type', activityFilter);
      }

      if (statusFilter === "rolled_back") {
        query = query.not('rolled_back_at', 'is', null);
      } else if (statusFilter === "active") {
        query = query.is('rolled_back_at', null);
      } else if (statusFilter === "failed") {
        query = query.gt('failed_count', 0);
      }

      const { data: importExportLogs } = await query;
      
      if (!importExportLogs || importExportLogs.length === 0) return [];
      
      // Fetch user profiles separately
      const userIds = [...new Set(importExportLogs.map(log => log.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', userIds);
      
      // Map profiles to logs
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      return importExportLogs.map(log => ({
        ...log,
        user_profile: profileMap.get(log.user_id)
      })) as ImportLog[];
    }
  });

  const filteredLogs = logs?.filter(log => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      log.user_profile?.first_name?.toLowerCase().includes(searchLower) ||
      log.user_profile?.last_name?.toLowerCase().includes(searchLower) ||
      log.table_name?.toLowerCase().includes(searchLower) ||
      log.file_name?.toLowerCase().includes(searchLower) ||
      log.file_format?.toLowerCase().includes(searchLower)
    );
  });

  const handleRollbackClick = async (batchId: string, fileName: string) => {
    setSelectedBatch({ batchId, fileName });
    
    // Get preview of what will be rolled back
    const preview = await getRollbackPreview(batchId);
    setRollbackPreview(preview);
    setRollbackDialogOpen(true);
  };

  const handleConfirmRollback = async () => {
    if (!selectedBatch) return;
    
    setIsRollingBack(true);
    
    try {
      const result = await rollbackImport(selectedBatch.batchId);
      
      if (result.success) {
        const totalDeleted = 
          result.deletedCounts.companies + 
          result.deletedCounts.contacts + 
          result.deletedCounts.communications + 
          result.deletedCounts.apolloActivities;
        
        toast({
          title: "Rollback Successful",
          description: `Deleted ${totalDeleted} records and restored ${result.restoredCount} engagement records.`,
        });
        
        // Invalidate related queries
        void queryClient.invalidateQueries({ queryKey: ['upload-logs'] });
        void queryClient.invalidateQueries({ queryKey: ['companies'] });
        void queryClient.invalidateQueries({ queryKey: ['contacts'] });
        void queryClient.invalidateQueries({ queryKey: ['communications'] });
        void queryClient.invalidateQueries({ queryKey: ['apollo-email-activities'] });
        
        refetch();
      } else {
        toast({
          title: "Rollback Failed",
          description: result.error || "An error occurred during rollback",
          variant: "destructive",
        });
      }
    } finally {
      setIsRollingBack(false);
      setRollbackDialogOpen(false);
      setSelectedBatch(null);
      setRollbackPreview(null);
    }
  };

  const exportToCSV = () => {
    if (!filteredLogs) return;

    const headers = ['Date', 'File Name', 'User', 'Activity', 'Table', 'Format', 'Records', 'Success', 'Failed', 'Duplicates', 'Status'];
    const rows = filteredLogs.map(log => [
      new Date(log.created_at).toLocaleString(),
      log.file_name || 'N/A',
      `${log.user_profile?.first_name || ''} ${log.user_profile?.last_name || ''}`.trim() || 'Unknown',
      log.activity_type,
      log.table_name,
      log.file_format || 'N/A',
      log.record_count,
      log.successful_count,
      log.failed_count,
      log.duplicate_count,
      log.rolled_back_at ? 'Rolled Back' : 'Active'
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `upload-log-${new Date().toISOString()}.csv`;
    a.click();
  };

  const getActivityIcon = (activity: string) => {
    return activity === 'IMPORT' ? <Upload className="h-4 w-4" /> : <Download className="h-4 w-4" />;
  };

  const getActivityBadgeVariant = (activity: string) => {
    return activity === 'IMPORT' ? 'default' : 'secondary';
  };

  const getStatusBadge = (log: ImportLog) => {
    if (log.rolled_back_at) {
      return <Badge variant="outline" className="text-muted-foreground">Rolled Back</Badge>;
    }
    if (log.failed_count > 0 && log.successful_count === 0) {
      return <Badge variant="destructive">Failed</Badge>;
    }
    if (log.failed_count > 0) {
      return <Badge variant="outline" className="text-amber-600 border-amber-600">Partial</Badge>;
    }
    return <Badge variant="outline" className="text-green-600 border-green-600">Active</Badge>;
  };

  const canRollback = (log: ImportLog) => {
    if (log.activity_type !== 'IMPORT') return false;
    if (log.rolled_back_at) return false;
    if (!log.rollback_available) return false;
    if (!log.batch_id) return false;
    
    // Check 30-day window
    const importDate = new Date(log.created_at);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return importDate >= thirtyDaysAgo;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle>Upload Log</CardTitle>
          </div>
          <CardDescription>
            View all data imports with batch tracking and rollback capability
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by filename, user, or table..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={activityFilter} onValueChange={setActivityFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="IMPORT">Imports</SelectItem>
                <SelectItem value="EXPORT">Exports</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="rolled_back">Rolled Back</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={exportToCSV} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>File Name</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Table(s)</TableHead>
                  <TableHead className="text-right">Results</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">Loading...</TableCell>
                  </TableRow>
                ) : filteredLogs && filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-xs whitespace-nowrap">
                        {format(new Date(log.created_at), 'MMM d, yyyy HH:mm')}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate" title={log.file_name || undefined}>
                        {log.file_name || <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {log.user_profile?.first_name && log.user_profile?.last_name
                          ? `${log.user_profile.first_name} ${log.user_profile.last_name}`
                          : 'Unknown User'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getActivityBadgeVariant(log.activity_type)} className="gap-1">
                          {getActivityIcon(log.activity_type)}
                          {log.activity_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">{log.table_name}</span>
                        {log.affected_tables && log.affected_tables.length > 1 && (
                          <span className="text-muted-foreground text-xs ml-1">
                            +{log.affected_tables.length - 1}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end gap-0.5 text-xs">
                          <span className="text-green-600">{log.successful_count} success</span>
                          {log.failed_count > 0 && (
                            <span className="text-destructive">{log.failed_count} failed</span>
                          )}
                          {log.duplicate_count > 0 && (
                            <span className="text-amber-600">{log.duplicate_count} dupes</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(log)}</TableCell>
                      <TableCell className="text-right">
                        {canRollback(log) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRollbackClick(log.batch_id!, log.file_name || 'Unknown')}
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Rollback
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No upload logs found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="text-sm text-muted-foreground">
            Showing {filteredLogs?.length || 0} of {logs?.length || 0} total logs
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={rollbackDialogOpen} onOpenChange={setRollbackDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirm Rollback
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Are you sure you want to rollback the import "{selectedBatch?.fileName}"? This will:
                </p>
                {rollbackPreview && (
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {rollbackPreview.companiesCount > 0 && (
                      <li>Delete {rollbackPreview.companiesCount} companies</li>
                    )}
                    {rollbackPreview.contactsCount > 0 && (
                      <li>Delete {rollbackPreview.contactsCount} contacts</li>
                    )}
                    {rollbackPreview.communicationsCount > 0 && (
                      <li>Delete {rollbackPreview.communicationsCount} communications</li>
                    )}
                    {rollbackPreview.activitiesCount > 0 && (
                      <li>Delete {rollbackPreview.activitiesCount} email activities</li>
                    )}
                    {rollbackPreview.restorableCount > 0 && (
                      <li>Restore {rollbackPreview.restorableCount} engagement records to original values</li>
                    )}
                  </ul>
                )}
                <p className="font-medium text-destructive">
                  This action cannot be undone.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRollingBack}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRollback}
              disabled={isRollingBack}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRollingBack ? "Rolling back..." : "Rollback Import"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
