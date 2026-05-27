import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Database, Clock, CheckCircle2, XCircle, Loader2, Play } from "lucide-react";
import { format } from "date-fns";

export function DataWarehouseSync() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);

  // Fetch sync configurations
  const { data: configs, isLoading } = useQuery({
    queryKey: ["sync-configurations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sync_configurations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch recent sync logs
  const { data: logs } = useQuery({
    queryKey: ["sync-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sync_logs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
  });

  // Toggle sync enabled
  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase
        .from("sync_configurations")
        .update({ is_enabled: enabled })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["sync-configurations"] });
      toast({
        title: "Settings updated",
        description: "Sync configuration has been updated",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Manual sync trigger
  const syncMutation = useMutation({
    mutationFn: async (configId: string) => {
      setSyncing(true);
      const { data, error } = await supabase.functions.invoke("sync-to-warehouse", {
        body: { config_id: configId, manual: true },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["sync-configurations"] });
      void queryClient.invalidateQueries({ queryKey: ["sync-logs"] });
      toast({
        title: "Sync completed",
        description: data.message || "Data sync completed successfully",
      });
      setSyncing(false);
    },
    onError: (error) => {
      toast({
        title: "Sync failed",
        description: error.message,
        variant: "destructive",
      });
      setSyncing(false);
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Success</Badge>;
      case "failed":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      case "running":
        return <Badge variant="secondary"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Running</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Data Warehouse Sync
          </CardTitle>
          <CardDescription>
            Configure automated data synchronization to BigQuery or other data warehouses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {configs?.map((config) => (
            <div key={config.id} className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="font-medium">{config.sync_name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Type: {config.sync_type} | Schedule: {config.schedule_cron}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  {config.last_sync_status && getStatusBadge(config.last_sync_status)}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => syncMutation.mutate(config.id)}
                    disabled={syncing}
                  >
                    {syncing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                    Run Now
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id={`sync-${config.id}`}
                  checked={config.is_enabled}
                  onCheckedChange={(checked) =>
                    toggleMutation.mutate({ id: config.id, enabled: checked })
                  }
                />
                <Label htmlFor={`sync-${config.id}`}>
                  Enable automatic sync
                </Label>
              </div>

              {config.last_sync_at && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  Last synced: {format(new Date(config.last_sync_at), "PPp")}
                </div>
              )}

              <div className="bg-muted/50 rounded p-3 text-sm">
                <p className="font-medium mb-2">Configuration:</p>
                <pre className="text-xs overflow-x-auto">
                  {JSON.stringify(config.configuration, null, 2)}
                </pre>
              </div>
            </div>
          ))}

          {!configs || configs.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No sync configurations found
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Sync History
          </CardTitle>
          <CardDescription>Recent synchronization attempts and results</CardDescription>
        </CardHeader>
        <CardContent>
          {logs && logs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Started</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Records</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">
                      {format(new Date(log.started_at), "PPp")}
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.sync_duration_ms ? `${(log.sync_duration_ms / 1000).toFixed(2)}s` : "-"}
                    </TableCell>
                    <TableCell>{getStatusBadge(log.status)}</TableCell>
                    <TableCell className="text-sm">{log.records_synced || 0}</TableCell>
                    <TableCell className="text-sm text-destructive">
                      {log.error_message || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No sync history available
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
