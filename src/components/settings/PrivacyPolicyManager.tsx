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
import { Plus, FileText, CheckCircle } from "lucide-react";

export function PrivacyPolicyManager() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    document_type: "privacy_policy",
    version: "",
    content: "",
    effective_date: "",
    change_summary: "",
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: documents } = useQuery({
    queryKey: ['compliance-documents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('compliance_documents')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const createDocumentMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('compliance_documents')
        .insert([{ ...data, published_by: user?.id }]);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['compliance-documents'] });
      toast({ title: "Compliance document created" });
      setOpen(false);
      setFormData({
        document_type: "privacy_policy",
        version: "",
        content: "",
        effective_date: "",
        change_summary: "",
      });
    }
  });

  const publishDocumentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('compliance_documents')
        .update({
          is_current: true,
          published_at: new Date().toISOString(),
          published_by: user?.id
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['compliance-documents'] });
      toast({ title: "Document published" });
    }
  });

  const getDocTypeLabel = (type: string) => {
    switch (type) {
      case 'privacy_policy': return 'Privacy Policy';
      case 'terms_of_service': return 'Terms of Service';
      case 'cookie_policy': return 'Cookie Policy';
      case 'dpa': return 'Data Processing Agreement';
      default: return type;
    }
  };

  const privacyDocs = documents?.filter(d => d.document_type === 'privacy_policy') || [];
  const termsDocs = documents?.filter(d => d.document_type === 'terms_of_service') || [];
  const currentPrivacy = privacyDocs.find(d => d.is_current);
  const currentTerms = termsDocs.find(d => d.is_current);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Privacy Policy</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {currentPrivacy ? (
              <>
                <div className="text-2xl font-bold">v{currentPrivacy.version}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Effective: {format(new Date(currentPrivacy.effective_date), 'PPP')}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No policy published</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Terms of Service</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {currentTerms ? (
              <>
                <div className="text-2xl font-bold">v{currentTerms.version}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Effective: {format(new Date(currentTerms.effective_date), 'PPP')}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No terms published</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Compliance Documents</CardTitle>
              <CardDescription>Manage privacy policy, terms of service, and legal documents</CardDescription>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Document
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Compliance Document</DialogTitle>
                  <DialogDescription>
                    Create a new version of a compliance document
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Document Type</Label>
                      <Select
                        value={formData.document_type}
                        onValueChange={(value) => setFormData({ ...formData, document_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="privacy_policy">Privacy Policy</SelectItem>
                          <SelectItem value="terms_of_service">Terms of Service</SelectItem>
                          <SelectItem value="cookie_policy">Cookie Policy</SelectItem>
                          <SelectItem value="dpa">Data Processing Agreement</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Version</Label>
                      <Input
                        value={formData.version}
                        onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                        placeholder="e.g., 2.0"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Effective Date</Label>
                    <Input
                      type="date"
                      value={formData.effective_date}
                      onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Change Summary</Label>
                    <Textarea
                      value={formData.change_summary}
                      onChange={(e) => setFormData({ ...formData, change_summary: e.target.value })}
                      placeholder="What changed in this version?"
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label>Document Content</Label>
                    <Textarea
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      placeholder="Full document content (Markdown supported)"
                      rows={12}
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => createDocumentMutation.mutate(formData)}
                    disabled={!formData.version || !formData.content || createDocumentMutation.isPending}
                  >
                    Create Document
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {documents?.map((doc) => (
              <div key={doc.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span className="font-medium">{getDocTypeLabel(doc.document_type)}</span>
                    <Badge variant="outline">v{doc.version}</Badge>
                    {doc.is_current && (
                      <Badge variant="default">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Current
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Effective: {format(new Date(doc.effective_date), 'PPP')}
                  </p>
                </div>
                {doc.change_summary && (
                  <p className="text-sm text-muted-foreground mb-2">{doc.change_summary}</p>
                )}
                {doc.published_at ? (
                  <p className="text-xs text-muted-foreground">
                    Published: {format(new Date(doc.published_at), 'PPP p')}
                  </p>
                ) : (
                  <Button
                    size="sm"
                    className="mt-2"
                    onClick={() => publishDocumentMutation.mutate(doc.id)}
                  >
                    Publish as Current
                  </Button>
                )}
              </div>
            ))}
            {(!documents || documents.length === 0) && (
              <p className="text-center text-muted-foreground py-8">No documents created yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
