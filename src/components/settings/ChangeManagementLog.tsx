import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Plus, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";

export function ChangeManagementLog() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    change_type: "code",
    change_description: "",
    risk_level: "medium",
    scheduled_date: "",
    impact_assessment: "",
    rollback_plan: "",
    change_window: "",
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: changes } = useQuery({
    queryKey: ['change-management'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('change_management_log')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const createChangeMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('change_management_log')
        .insert([{ ...data, requested_by: user?.id }]);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['change-management'] });
      toast({ title: "Change request created" });
      setOpen(false);
      setFormData({
        change_type: "code",
        change_description: "",
        risk_level: "medium",
        scheduled_date: "",
        impact_assessment: "",
        rollback_plan: "",
        change_window: "",
      });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status };
      const { data: { user } } = await supabase.auth.getUser();
      
      if (status === 'approved') {
        updates.approved_by = user?.id;
      } else if (status === 'implemented') {
        updates.implemented_by = user?.id;
        updates.implemented_at = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from('change_management_log')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['change-management'] });
      toast({ title: "Change status updated" });
    }
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'implemented': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'approved': return <CheckCircle className="h-4 w-4 text-blue-600" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-destructive" />;
      case 'rolled_back': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default: return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const pendingCount = changes?.filter(c => c.status === 'requested').length || 0;
  const approvedCount = changes?.filter(c => c.status === 'approved' || c.status === 'scheduled').length || 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Changes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Changes</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Change Management Log</CardTitle>
              <CardDescription>Track and approve system changes</CardDescription>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Request Change
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Request Change</DialogTitle>
                  <DialogDescription>
                    Document a change to the system for approval and tracking
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Change Type</Label>
                      <Select
                        value={formData.change_type}
                        onValueChange={(value) => setFormData({ ...formData, change_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="code">Code</SelectItem>
                          <SelectItem value="infrastructure">Infrastructure</SelectItem>
                          <SelectItem value="configuration">Configuration</SelectItem>
                          <SelectItem value="security">Security</SelectItem>
                          <SelectItem value="database">Database</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Risk Level</Label>
                      <Select
                        value={formData.risk_level}
                        onValueChange={(value) => setFormData({ ...formData, risk_level: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Change Description</Label>
                    <Textarea
                      value={formData.change_description}
                      onChange={(e) => setFormData({ ...formData, change_description: e.target.value })}
                      placeholder="Describe what will be changed and why"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Scheduled Date</Label>
                      <Input
                        type="datetime-local"
                        value={formData.scheduled_date}
                        onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Change Window</Label>
                      <Input
                        value={formData.change_window}
                        onChange={(e) => setFormData({ ...formData, change_window: e.target.value })}
                        placeholder="e.g., 2am-4am EST"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Impact Assessment</Label>
                    <Textarea
                      value={formData.impact_assessment}
                      onChange={(e) => setFormData({ ...formData, impact_assessment: e.target.value })}
                      placeholder="What systems and users will be affected?"
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label>Rollback Plan</Label>
                    <Textarea
                      value={formData.rollback_plan}
                      onChange={(e) => setFormData({ ...formData, rollback_plan: e.target.value })}
                      placeholder="How can this change be reverted if needed?"
                      rows={2}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => createChangeMutation.mutate(formData)}
                    disabled={!formData.change_description || createChangeMutation.isPending}
                  >
                    Submit Request
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {changes?.map((change) => (
              <div key={change.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(change.status)}
                    <Badge variant={getRiskColor(change.risk_level)}>
                      {change.risk_level}
                    </Badge>
                    <Badge variant="outline" className="capitalize">
                      {change.change_type}
                    </Badge>
                    <Badge variant="secondary" className="capitalize">
                      {change.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(change.created_at), 'PPP')}
                  </p>
                </div>
                <p className="font-medium mb-2">{change.change_description}</p>
                {change.scheduled_date && (
                  <p className="text-sm text-muted-foreground mb-2">
                    Scheduled: {format(new Date(change.scheduled_date), 'PPP p')}
                    {change.change_window && ` (${change.change_window})`}
                  </p>
                )}
                {change.impact_assessment && (
                  <div className="mt-2 p-3 bg-muted rounded">
                    <p className="text-xs font-medium mb-1">Impact:</p>
                    <p className="text-sm">{change.impact_assessment}</p>
                  </div>
                )}
                {change.status === 'requested' && (
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      onClick={() => updateStatusMutation.mutate({ id: change.id, status: 'approved' })}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateStatusMutation.mutate({ id: change.id, status: 'rejected' })}
                    >
                      Reject
                    </Button>
                  </div>
                )}
                {change.status === 'approved' && (
                  <Button
                    size="sm"
                    className="mt-3"
                    onClick={() => updateStatusMutation.mutate({ id: change.id, status: 'implemented' })}
                  >
                    Mark Implemented
                  </Button>
                )}
              </div>
            ))}
            {(!changes || changes.length === 0) && (
              <p className="text-center text-muted-foreground py-8">No changes recorded yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
