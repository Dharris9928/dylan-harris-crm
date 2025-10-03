import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Download, CheckCircle2, AlertCircle, Clock, ChevronRight } from "lucide-react";
import { format } from "date-fns";

interface ImportExportLog {
  id: string;
  activity_type: 'import' | 'export';
  table_name: string;
  record_count: number;
  successful_count: number;
  failed_count: number;
  duplicate_count: number;
  file_format: string | null;
  error_summary: string | null;
  detailed_errors: string[] | null;
  created_at: string;
}

export function ImportExportActivityLog() {
  const [logs, setLogs] = useState<ImportExportLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('import_export_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setLogs((data || []) as ImportExportLog[]);
    } catch (error) {
      console.error('Error fetching import/export logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getActivityIcon = (type: 'import' | 'export') => {
    return type === 'import' 
      ? <Upload className="h-4 w-4" />
      : <Download className="h-4 w-4" />;
  };

  const getStatusBadge = (log: ImportExportLog) => {
    if (log.failed_count === 0 && log.successful_count > 0) {
      return (
        <Badge variant="outline" className="gap-1 bg-green-50 text-green-700 border-green-200">
          <CheckCircle2 className="h-3 w-3" />
          Success
        </Badge>
      );
    }
    if (log.failed_count > 0) {
      return (
        <Badge variant="outline" className="gap-1 bg-yellow-50 text-yellow-700 border-yellow-200">
          <AlertCircle className="h-3 w-3" />
          Partial
        </Badge>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Import/Export Activity Log
          </CardTitle>
          <CardDescription>Loading activity logs...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Import/Export Activity Log
        </CardTitle>
        <CardDescription>
          Recent import and export activities across the system
        </CardDescription>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No import or export activities yet
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className={`p-2 rounded-lg ${
                    log.activity_type === 'import' 
                      ? 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400'
                      : 'bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400'
                  }`}>
                    {getActivityIcon(log.activity_type)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium capitalize">
                        {log.activity_type}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {log.table_name}
                      </Badge>
                      {log.file_format && (
                        <Badge variant="outline" className="text-xs">
                          {log.file_format}
                        </Badge>
                      )}
                      {getStatusBadge(log)}
                    </div>
                    
                    <div className="text-sm text-muted-foreground space-x-4">
                      <span className="text-green-600 dark:text-green-400">
                        ✓ {log.successful_count} successful
                      </span>
                      {log.duplicate_count > 0 && (
                        <span className="text-yellow-600 dark:text-yellow-400">
                          ⊘ {log.duplicate_count} duplicates
                        </span>
                      )}
                      {log.failed_count > 0 && (
                        <span className="text-red-600 dark:text-red-400">
                          ✗ {log.failed_count} failed
                        </span>
                      )}
                    </div>
                    
                    {log.error_summary && (
                      <div className="mt-2">
                        <div 
                          className="p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive cursor-pointer hover:bg-destructive/20 transition-colors flex items-center justify-between"
                          onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                        >
                          <span>{log.error_summary}</span>
                          {log.detailed_errors && log.detailed_errors.length > 0 && (
                            <ChevronRight className={`h-4 w-4 transition-transform ${expandedLogId === log.id ? 'rotate-90' : ''}`} />
                          )}
                        </div>
                        {expandedLogId === log.id && log.detailed_errors && log.detailed_errors.length > 0 && (
                          <div className="mt-2 p-3 bg-muted border border-border rounded text-xs max-h-64 overflow-y-auto space-y-1">
                            {log.detailed_errors.map((error, idx) => (
                              <div key={idx} className="text-muted-foreground font-mono">
                                {error}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="text-right text-sm text-muted-foreground">
                  <div>{format(new Date(log.created_at), 'MMM d, yyyy')}</div>
                  <div className="text-xs">{format(new Date(log.created_at), 'h:mm a')}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}