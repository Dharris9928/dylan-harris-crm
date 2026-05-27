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
import { Plus, AlertTriangle, Shield } from "lucide-react";

export function SecurityIncidentsTracker() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    incident_type: "policy_violation",
    severity: "medium",
    incident_summary: "",
    impact_description: "",
    affected_users_count: 0,
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: incidents } = useQuery({
    queryKey: ['security-incidents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('security_incidents')
        .select('*')
        .order('reported_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const createIncidentMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('security_incidents')
        .insert([{ ...data, reported_by: user?.id, assigned_to: user?.id }]);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['security-incidents'] });
      toast({ title: "Security incident reported" });
      setOpen(false);
      setFormData({
        incident_type: "policy_violation",
        severity: "medium",
        incident_summary: "",
        impact_description: "",
        affected_users_count: 0,
      });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status };
      if (status === 'contained') {
        updates.contained_at = new Date().toISOString();
      } else if (status === 'resolved') {
        updates.resolved_at = new Date().toISOString();
      }
      const { error } = await supabase
        .from('security_incidents')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['security-incidents'] });
      toast({ title: "Incident status updated" });
    }
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const openIncidents = incidents?.filter(i => i.status === 'open' || i.status === 'investigating').length || 0;
  const criticalIncidents = incidents?.filter(i => i.severity === 'critical' && i.status !== 'closed').length || 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Incidents</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openIncidents}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{criticalIncidents}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Incidents</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{incidents?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Security Incidents</CardTitle>
              <CardDescription>Track and manage security incidents</CardDescription>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Report Incident
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Report Security Incident</DialogTitle>
                  <DialogDescription>
                    Document a security incident for tracking and response
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Incident Type</Label>
                      <Select
                        value={formData.incident_type}
                        onValueChange={(value) => setFormData({ ...formData, incident_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unauthorized_access">Unauthorized Access</SelectItem>
                          <SelectItem value="data_breach">Data Breach</SelectItem>
                          <SelectItem value="malware">Malware</SelectItem>
                          <SelectItem value="phishing">Phishing</SelectItem>
                          <SelectItem value="dos">DoS Attack</SelectItem>
                          <SelectItem value="policy_violation">Policy Violation</SelectItem>
                          <SelectItem value="system_failure">System Failure</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Severity</Label>
                      <Select
                        value={formData.severity}
                        onValueChange={(value) => setFormData({ ...formData, severity: value })}
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
                    <Label>Incident Summary</Label>
                    <Textarea
                      value={formData.incident_summary}
                      onChange={(e) => setFormData({ ...formData, incident_summary: e.target.value })}
                      placeholder="Brief description of what happened"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label>Impact Description</Label>
                    <Textarea
                      value={formData.impact_description}
                      onChange={(e) => setFormData({ ...formData, impact_description: e.target.value })}
                      placeholder="What systems and data were affected?"
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label>Affected Users Count</Label>
                    <Input
                      type="number"
                      value={formData.affected_users_count}
                      onChange={(e) => setFormData({ ...formData, affected_users_count: parseInt(e.target.value) || 0 })}
                      min="0"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => createIncidentMutation.mutate(formData)}
                    disabled={!formData.incident_summary || createIncidentMutation.isPending}
                  >
                    Report Incident
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {incidents?.map((incident) => (
              <div key={incident.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={getSeverityColor(incident.severity)}>
                      {incident.severity}
                    </Badge>
                    <Badge variant="outline" className="capitalize">
                      {incident.incident_type.replace('_', ' ')}
                    </Badge>
                    <Badge variant="secondary" className="capitalize">
                      {incident.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(incident.reported_at), 'PPP')}
                  </p>
                </div>
                <p className="font-medium mb-2">{incident.incident_summary}</p>
                {incident.impact_description && (
                  <p className="text-sm text-muted-foreground mb-2">{incident.impact_description}</p>
                )}
                {incident.affected_users_count > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Affected users: {incident.affected_users_count}
                  </p>
                )}
                {(incident.status === 'open' || incident.status === 'investigating') && (
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      onClick={() => updateStatusMutation.mutate({ id: incident.id, status: 'investigating' })}
                    >
                      Start Investigation
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateStatusMutation.mutate({ id: incident.id, status: 'contained' })}
                    >
                      Mark Contained
                    </Button>
                  </div>
                )}
                {incident.status === 'contained' && (
                  <Button
                    size="sm"
                    className="mt-3"
                    onClick={() => updateStatusMutation.mutate({ id: incident.id, status: 'resolved' })}
                  >
                    Mark Resolved
                  </Button>
                )}
              </div>
            ))}
            {(!incidents || incidents.length === 0) && (
              <p className="text-center text-muted-foreground py-8">No incidents reported</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
