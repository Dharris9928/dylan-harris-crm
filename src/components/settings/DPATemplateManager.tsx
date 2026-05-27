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
import { Plus, FileCheck, CheckCircle } from "lucide-react";

export function DPATemplateManager() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    template_name: "",
    template_type: "customer",
    template_content: "",
    jurisdiction: "",
    version: "",
    next_review_date: "",
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: templates } = useQuery({
    queryKey: ['dpa-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dpa_templates')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const { data: agreements } = useQuery({
    queryKey: ['dpa-agreements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dpa_agreements')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('dpa_templates')
        .insert([{ ...data, created_by: user?.id, last_reviewed_date: new Date().toISOString().split('T')[0] }]);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['dpa-templates'] });
      toast({ title: "DPA template created" });
      setOpen(false);
      setFormData({
        template_name: "",
        template_type: "customer",
        template_content: "",
        jurisdiction: "",
        version: "",
        next_review_date: "",
      });
    }
  });

  const approveTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('dpa_templates')
        .update({
          legal_approved: true,
          legal_approved_by: user?.id,
          legal_approved_at: new Date().toISOString()
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['dpa-templates'] });
      toast({ title: "Template approved" });
    }
  });

  const activeTemplates = templates?.filter(t => t.is_active).length || 0;
  const approvedTemplates = templates?.filter(t => t.legal_approved).length || 0;
  const signedAgreements = agreements?.filter(a => a.status === 'signed').length || 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Templates</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeTemplates}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Templates</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedTemplates}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Signed Agreements</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{signedAgreements}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>DPA Templates</CardTitle>
              <CardDescription>Manage Data Processing Agreement templates</CardDescription>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create DPA Template</DialogTitle>
                  <DialogDescription>
                    Create a new Data Processing Agreement template
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Template Name</Label>
                    <Input
                      value={formData.template_name}
                      onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
                      placeholder="e.g., Standard Customer DPA - EU"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Template Type</Label>
                      <Select
                        value={formData.template_type}
                        onValueChange={(value) => setFormData({ ...formData, template_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="customer">Customer</SelectItem>
                          <SelectItem value="vendor">Vendor</SelectItem>
                          <SelectItem value="subprocessor">Subprocessor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Jurisdiction</Label>
                      <Input
                        value={formData.jurisdiction}
                        onChange={(e) => setFormData({ ...formData, jurisdiction: e.target.value })}
                        placeholder="e.g., EU, US, UK"
                      />
                    </div>
                    <div>
                      <Label>Version</Label>
                      <Input
                        value={formData.version}
                        onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                        placeholder="e.g., 1.0"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Next Review Date</Label>
                    <Input
                      type="date"
                      value={formData.next_review_date}
                      onChange={(e) => setFormData({ ...formData, next_review_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Template Content</Label>
                    <Textarea
                      value={formData.template_content}
                      onChange={(e) => setFormData({ ...formData, template_content: e.target.value })}
                      placeholder="Full DPA template content"
                      rows={12}
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => createTemplateMutation.mutate(formData)}
                    disabled={!formData.template_name || !formData.template_content || createTemplateMutation.isPending}
                  >
                    Create Template
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {templates?.map((template) => (
              <div key={template.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileCheck className="h-4 w-4" />
                    <span className="font-medium">{template.template_name}</span>
                    <Badge variant="outline" className="capitalize">
                      {template.template_type}
                    </Badge>
                    <Badge variant="outline">v{template.version}</Badge>
                    {template.legal_approved && (
                      <Badge variant="default">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Legal Approved
                      </Badge>
                    )}
                    {!template.is_active && (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </div>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Jurisdiction: {template.jurisdiction}</p>
                  {template.last_reviewed_date && (
                    <p>Last Reviewed: {format(new Date(template.last_reviewed_date), 'PPP')}</p>
                  )}
                  {template.next_review_date && (
                    <p>Next Review: {format(new Date(template.next_review_date), 'PPP')}</p>
                  )}
                </div>
                {!template.legal_approved && (
                  <Button
                    size="sm"
                    className="mt-3"
                    onClick={() => approveTemplateMutation.mutate(template.id)}
                  >
                    Approve Template
                  </Button>
                )}
              </div>
            ))}
            {(!templates || templates.length === 0) && (
              <p className="text-center text-muted-foreground py-8">No DPA templates created yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
