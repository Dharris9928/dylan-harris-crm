import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Shield, Plus, Trash2, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export function AllowedDomainsManager() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [domainType, setDomainType] = useState<"business" | "partner" | "contractor">("business");
  const [notes, setNotes] = useState("");
  const queryClient = useQueryClient();

  const { data: domains, isLoading } = useQuery({
    queryKey: ['allowed-email-domains'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('allowed_email_domains')
        .select('*')
        .order('added_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const addDomainMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('allowed_email_domains')
        .insert({
          domain: newDomain.toLowerCase().trim(),
          domain_type: domainType,
          notes: notes.trim() || null,
          added_by: user.id
        });

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['allowed-email-domains'] });
      setIsAddDialogOpen(false);
      setNewDomain("");
      setNotes("");
      toast.success('Domain added successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add domain');
    }
  });

  const toggleDomainMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('allowed_email_domains')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['allowed-email-domains'] });
      toast.success('Domain status updated');
    },
    onError: () => {
      toast.error('Failed to update domain status');
    }
  });

  const deleteDomainMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('allowed_email_domains')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['allowed-email-domains'] });
      toast.success('Domain removed');
    },
    onError: () => {
      toast.error('Failed to remove domain');
    }
  });

  const verifyDomainMutation = useMutation({
    mutationFn: async (domain: string) => {
      const { data, error } = await supabase.functions.invoke('verify-email-domain', {
        body: { domain }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data, domain) => {
      if (data.isValid) {
        toast.success(`Domain ${domain} verified successfully`);
      } else {
        toast.error(`Domain ${domain} verification failed: ${data.reason}`);
      }
      void queryClient.invalidateQueries({ queryKey: ['allowed-email-domains'] });
    },
    onError: () => {
      toast.error('Failed to verify domain');
    }
  });

  const handleAddDomain = () => {
    if (!newDomain.trim()) {
      toast.error('Please enter a domain');
      return;
    }

    // Basic validation
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(newDomain.trim())) {
      toast.error('Please enter a valid domain (e.g., example.com)');
      return;
    }

    addDomainMutation.mutate();
  };

  const getTypeBadge = (type: string) => {
    const colors = {
      business: 'default',
      partner: 'secondary',
      contractor: 'outline'
    };
    return <Badge variant={colors[type as keyof typeof colors] as any}>{type}</Badge>;
  };

  const getVerificationBadge = (status: string | null, mxValid: boolean | null) => {
    if (status === 'verified' && mxValid) {
      return <Badge variant="default" className="gap-1"><CheckCircle className="h-3 w-3" />Verified</Badge>;
    } else if (status === 'failed') {
      return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Failed</Badge>;
    }
    return <Badge variant="secondary" className="gap-1"><AlertCircle className="h-3 w-3" />Unverified</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Allowed Email Domains
            </CardTitle>
            <CardDescription>
              Manage authorized email domains for user registration
            </CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Domain
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Allowed Domain</DialogTitle>
                <DialogDescription>
                  Add a new email domain to the authorization list
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="domain">Domain</Label>
                  <Input
                    id="domain"
                    placeholder="example.com"
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter domain without @symbol (e.g., company.com)
                  </p>
                </div>
                <div>
                  <Label htmlFor="type">Domain Type</Label>
                  <Select value={domainType} onValueChange={(v) => setDomainType(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="business">Business</SelectItem>
                      <SelectItem value="partner">Partner</SelectItem>
                      <SelectItem value="contractor">Contractor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Add any notes about this domain..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddDomain} disabled={addDomainMutation.isPending}>
                  {addDomainMutation.isPending ? 'Adding...' : 'Add Domain'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading domains...</div>
        ) : domains && domains.length > 0 ? (
          <div className="border rounded-lg overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domain</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Verification</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {domains.map((domain) => (
                  <TableRow key={domain.id}>
                    <TableCell className="font-medium">{domain.domain}</TableCell>
                    <TableCell>{getTypeBadge(domain.domain_type)}</TableCell>
                    <TableCell>
                      <Badge variant={domain.is_active ? "default" : "secondary"}>
                        {domain.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {getVerificationBadge(domain.verification_status, domain.mx_records_valid)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(domain.added_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {domain.verification_status === 'verified' && domain.mx_records_valid ? (
                          <Badge variant="default" className="gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Verified
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => verifyDomainMutation.mutate(domain.domain)}
                            disabled={verifyDomainMutation.isPending}
                          >
                            Verify
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleDomainMutation.mutate({ 
                            id: domain.id, 
                            isActive: domain.is_active 
                          })}
                        >
                          {domain.is_active ? 'Disable' : 'Enable'}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            if (confirm(`Remove domain ${domain.domain}?`)) {
                              deleteDomainMutation.mutate(domain.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No domains configured. Add your first domain to get started.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
